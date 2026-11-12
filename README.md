# Gym App

MVP информационной системы спортивного зала: администратор работает в веб-панели, тренер и клиент — в мобильном приложении (Flutter Android). Backend — NestJS + Prisma + PostgreSQL + Redis.

## Стек

| Компонент | Технологии |
| --- | --- |
| Backend | NestJS 10, Prisma 6, PostgreSQL 16, Redis 7, JWT, Socket.IO, Swagger |
| Web-admin | React 19, Vite, TypeScript, Ant Design, TanStack Query, Zustand, axios |
| Mobile | Flutter (Dart), Riverpod, Dio, fl_chart, socket_io_client, Firebase Messaging |

## Структура репозитория

```
backend/      NestJS API, Prisma schema/migrations/seed, e2e-тесты
web-admin/    Веб-панель администратора (nginx в проде)
mobile/       Flutter-приложение (тренер + клиент)
docs/         ТЗ, ER-модель, описание API, процесс работ
docker-compose.yml
Makefile
```

## Требования

- Docker и Docker Compose
- Node.js 20+ и pnpm (для локальной разработки backend/web-admin)
- Flutter SDK (для сборки mobile)

## Запуск (Docker)

> Если `make` не установлен, используйте прямые команды:
> `docker compose up -d --build`, `docker compose exec backend npx prisma db seed`,
> `docker compose logs -f backend`, `docker compose down`.

### С нуля

```bash
# 1. Создать .env и задать свои секреты (JWT_SECRET и JWT_REFRESH_SECRET — не короче 32 символов)
cp .env.example .env
nano .env

# 2. Собрать и запустить postgres, redis, backend, web-admin
make up
```

`backend` при старте сам применяет миграции (`prisma migrate deploy`) и создаёт
администратора из `ADMIN_PHONE`/`ADMIN_PASSWORD` (`prisma db seed`, идемпотентно).
Отдельные `make migrate` и `make seed` для чистого запуска не нужны — они остаются
для ручного повторного запуска.

Проверка:

- Backend health: `http://localhost:8080/api/v1/health` → `{"status":"ok"}`
- Web-admin: `http://localhost:3000` (вход по `ADMIN_PHONE` / `ADMIN_PASSWORD`)
- Swagger UI: `http://localhost:8080/api/docs` — только при `NODE_ENV != production`;
  в docker-образе задан `NODE_ENV=production`, поэтому там Swagger отключён.

Остановка: `make down` (с удалением БД — `docker compose down -v`).

### Диагностика

```bash
docker compose ps                  # статусы контейнеров
docker compose logs -f backend     # логи backend (там же результат seed)
docker compose logs -f postgres    # логи БД
docker compose logs -f web-admin   # логи nginx
```

Если backend падает с `Invalid environment configuration` — проверьте, что в `.env`
заданы `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PHONE`,
`ADMIN_PASSWORD`, `DEFAULT_TIMEZONE`, а секреты не начинаются с `changeme`.

Если логин в web-admin возвращает 401 — проверьте в логах backend, что seed
выполнился без ошибок, и учётные данные в `.env` (`ADMIN_PHONE`/`ADMIN_PASSWORD`).
Seed запускается автоматически при старте backend; вручную — `make seed`.

### Makefile

| Команда | Действие |
| --- | --- |
| `make up` | `docker compose up -d --build` |
| `make down` | остановить и удалить контейнеры |
| `make migrate` | `prisma migrate deploy` в контейнере backend |
| `make seed` | `prisma db seed` (админ из `.env`) |
| `make test` | `pnpm test:e2e` в контейнере backend |
| `make logs` | логи backend |
| `make psql` | psql к БД `gym` |

## Переменные окружения

Задаются в `.env` (см. `.env.example`):

| Переменная | Назначение |
| --- | --- |
| `POSTGRES_PASSWORD` | пароль PostgreSQL |
| `JWT_SECRET` | секрет access-токена (≥32 символов) |
| `JWT_REFRESH_SECRET` | секрет refresh-токена (≥32 символов) |
| `DEFAULT_CLIENT_PASSWORD` | начальный пароль клиентов/тренеров |
| `ADMIN_PHONE`, `ADMIN_PASSWORD` | учётные данные администратора для seed |
| `DEFAULT_TIMEZONE` | часовой пояс по умолчанию (IANA) |
| `REDIS_PASSWORD` | пароль Redis |
| `FCM_CREDENTIALS_JSON` | JSON сервисного аккаунта Firebase (пусто = push выключен) |

## Backend

- Глобальный префикс API: `/api/v1`
- Swagger: `/api/docs`, OpenAPI JSON: `/api/docs-json`
- Авторизация: JWT access 15m / refresh 30d с ротацией refresh-токена
- WebSocket чата: namespace `/chat` (`chat:join`, `chat:leave`, `chat:send`, событие `chat:message`)

Локально:

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm start:dev      # watch-режим
pnpm build          # production-сборка
```

Основные модули: auth, gyms, gym-links, equipment, upload, exercises,
food-products, goals, clients, trainers, client-trainers, trainer-clients,
weight-measurements, reports, workouts, nutrition, notifications, chats,
reception, receptions, dashboard, demo.

## Web-admin

```bash
cd web-admin
pnpm install
pnpm dev            # dev-сервер Vite
pnpm build          # production-сборка
pnpm lint           # oxlint
```

Разделы: логин, залы, тренажёры, упражнения, продукты питания, цели, клиенты, тренеры, замеры веса, ресепшн, отчёты, уведомления, чаты, настройки (часовой пояс).

## Mobile

```bash
cd mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Базовый URL API можно задать при сборке или в приложении (иконка «Адрес сервера»):

```bash
flutter run --dart-define=API_URL=http://<host>:8080/api/v1
```

Приложение поддерживает обе роли:

- **Тренер**: мои клиенты, создание тренировок и шаблонов, замеры веса, прогресс (графики), питание, чат, настройки.
- **Клиент**: календарь тренировок, выполнение тренировки дня, питание, отчёты с графиками, чат, уведомления (FCM), настройки.

Firebase push инициализируется только при наличии `google-services.json`; без него приложение работает без push.

## Тесты

Backend e2e (нужна поднятая БД):

```bash
make test
# или
cd backend && pnpm test:e2e
```

Mobile:

```bash
cd mobile && flutter analyze && flutter test
```

Web-admin:

```bash
cd web-admin && pnpm lint && pnpm build
```

## Документация

- `docs/tehzadanie.md` — техническое задание
- `docs/er.md` — ER-модель
- `docs/api.md` — описание API (OpenAPI)
- `docs/readme.md` — журнал изменений функционала
- `docs/<номер>_task_<описание>.md` — постановка задания
- `docs/<номер>_plan_<описание>.md` — план работ
- `docs/<номер>_tests_<описание>.md` — автотесты и результаты
- `docs/<номер>_result_<описание>.md` — результат задания
- `docs/archive/` — архив ранних документов

## Известные ограничения

- FCM push требует реальный `secrets/fcm.json` (сервисный аккаунт Firebase) и физическое устройство для боевой проверки.
- Чат рассчитан на один инстанс backend (без Redis pub/sub).
- Офлайн-режим и оплата — вне MVP.
- UI-smoke на физическом Android-устройстве выполняется вручную; в среде разработки эмулятор недоступен.
