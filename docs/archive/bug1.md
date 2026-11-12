# Баг-репорт: чистое развёртывание Gym App

Дата проверки: 2026-11-10
Окружение: Docker Compose (postgres 16, redis 7, backend NestJS, web-admin nginx)

## Найденные проблемы

### BUG-1 (критично): авторизация в web-admin возвращает 500 на чистой БД

**Симптомы**
- `POST /api/v1/auth/login` (напрямую в backend и через nginx) → `HTTP 500`
  `{"statusCode":500,"message":"Internal server error"}`.
- В логах backend:

```text
PrismaClientKnownRequestError:
Invalid `prisma.user.findUnique()` invocation:
The table `public.User` does not exist in the current database.
    at async AuthService.login (dist/src/auth/auth.service.js:63)
```

- `prisma migrate status`:

```text
Following migration have not yet been applied:
20261108121212_init
```

- `\dt` в PostgreSQL: `Did not find any relations.`

**Причина**
При старте контейнера `backend` миграции не применяются. `make up` поднимает
приложение на пустой БД, и любой запрос к таблицам падает с 500. `make migrate`
и `make seed` нужно было запускать вручную, поэтому чистое развёртывание
получалось нерабочим.

**Исправление**
В `docker-compose.yml` для сервиса `backend` добавлена команда, которая перед
запуском приложения применяет миграции:

```yaml
command: sh -c "./node_modules/.bin/prisma migrate deploy && node dist/src/main.js"
```

Теперь `docker compose up` на пустой БД сам создаёт схему. `seed` (создание
администратора) по-прежнему выполняется отдельно командой `make seed`, чтобы
не перезаписывать пароль администратора при каждом рестарте.

### BUG-2 (низкая): неверный путь в `start:prod`

**Симптомы**
`backend/package.json` → `"start:prod": "node dist/main.js"`, но из-за
`tsconfig.json` (`include: ["src/**/*", "prisma/**/*"]`) сборка кладёт точку
входа в `dist/src/main.js`. Запуск `pnpm start:prod` падал бы с
`Cannot find module '/app/dist/main.js'`.

**Исправление**
`start:prod` изменён на `node dist/src/main.js` (совпадает с `CMD` в Dockerfile).

### BUG-3 (критично для сборки): `pnpm install` зависает/падает на чистой сборке

**Симптомы**
- `docker compose up -d --build` падает на шаге `RUN pnpm install --frozen-lockfile`
  с `ERR_SOCKET_TIMEOUT` и сообщениями вида:

```text
WARN  GET https://registry.npmjs.org/... error (ERR_SOCKET_TIMEOUT)
FetchError: request to https://registry.npmjs.org/... failed, reason: Socket timeout
```

- В другом прогоне `npm install -g pnpm@9` занял 17 минут.

**Причина**
В сети контейнера DNS отдаёт для `registry.npmjs.org` в первую очередь IPv6
адреса, а IPv6 из контейнера недоступен. Node пытается подключиться по IPv6,
ждёт таймаут и только потом переходит на IPv4. Проверено: с
`NODE_OPTIONS=--dns-result-order=ipv4first` установка занимает ~15 секунд.

**Исправление**
В `backend/Dockerfile` и `web-admin/Dockerfile` добавлено:

```dockerfile
ENV NODE_OPTIONS=--dns-result-order=ipv4first
```

Это заставляет Node сначала использовать IPv4 и делает сборку стабильной.

### BUG-4 (средне): загруженные фото не отдаются по `/uploads/*`

**Симптомы**
- `GET /uploads/<file>.png` → `HTTP 404` и напрямую в backend (`:8080`), и через
  nginx (`:3000`), хотя файл физически лежит в томе `./uploads`.
- В логах backend:

```text
ERROR [ExceptionsHandler] ENOENT: no such file or directory, stat '/app/dist/uploads/index.html'
```

**Причина**
В `backend/src/app.module.ts` для `ServeStaticModule` был указан
`rootPath: join(__dirname, '..', 'uploads')`. В production `__dirname` равен
`/app/dist/src`, поэтому корень раздачи вычислялся как `/app/dist/uploads`.
При этом `UploadController` сохраняет файлы в `join(process.cwd(), 'uploads')`,
то есть в `/app/uploads` (куда и смонтирован том).

**Исправление**
`rootPath` приведён к тому же каталогу, что использует загрузка:

```ts
ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'uploads'),
  serveRoot: '/uploads',
}),
```

## Что исправлено

- `docker-compose.yml` — авто-применение миграций при старте backend (BUG-1).
- `backend/package.json` — исправлен путь в `start:prod` (BUG-2).
- `backend/Dockerfile`, `web-admin/Dockerfile` — IPv4-first для DNS, чтобы
  `pnpm install` не зависал на IPv6 (BUG-3).
- `backend/src/app.module.ts` — корректный `rootPath` для раздачи `/uploads`
  (BUG-4).
- `bug1.md` — этот файл.

## Проверка после исправления

Чистое развёртывание (`docker compose down -v` → `up -d --build`) прошло успешно:

- backend, postgres, redis, web-admin — все контейнеры запущены; миграции
  применились автоматически, схема из 21 таблицы создана, `prisma db seed`
  выполнен.
- `GET /api/v1/health` → 200; Swagger `/api/docs` и `/api/docs-json` → 200;
  web-admin `:3000` → 200; проксирование `/api/v1/*` через nginx → 200.
- Логин администратора и `POST /api/v1/auth/refresh` → 200; админ-эндпоинты
  (`/api/v1/admin/gyms`, `/api/v1/gyms`) → 200.
- `pnpm test:e2e` (backend) → 16 suites, 118 тестов, все passed. Прогон выполнен
  внутри контейнера `backend` (`docker compose exec backend pnpm test:e2e`),
  где заданы переменные окружения из `docker-compose.yml`. При локальном запуске
  без `backend/.env` тесты падают с `Configuration key "JWT_SECRET" does not
  exist` — это особенность окружения, а не ошибка приложения. Ожидаемое
  сообщение `FCM credentials not found ... push disabled` не является ошибкой.
- web-admin: `pnpm lint` без ошибок (2 warning в `src/router.tsx`), `pnpm build`
  успешно.
- mobile: `flutter pub get`, `flutter analyze` (no issues), `flutter test`
  (12 passed), `flutter build apk --debug` — успешно.
- uploads после фикса BUG-4: и ранее загруженный, и новый файл (через
  `POST /api/v1/admin/upload`) отдаются с `HTTP 200` и `image/png` напрямую и
  через nginx.
