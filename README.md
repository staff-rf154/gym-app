# Gym App

Информационная система спортивного зала: администратор и ресепшн работают в
веб-панели, тренер и клиент — в едином Android-приложении.

- Backend: NestJS + Prisma + PostgreSQL + Redis.
- Web-admin: React + Vite + Ant Design.
- Mobile: Flutter (одно приложение для тренера и клиента).
- Внешний вход: HTTPS `https://demogym.staff-rf.ru:3000`.
- API: `https://demogym.staff-rf.ru:3000/api/v1`.

## Возможности

- ADMIN: залы, тренажёры, упражнения, продукты, цели, клиенты, тренеры,
  ресепшены, связи, замеры, шаблоны, отчёты, рассылки, чаты, настройки сервера.
- RECEPTION: клиенты, тренеры и связи только своего зала, замеры, сброс
  паролей, шаблоны своего зала, уведомления.
- TRAINER: клиенты, календарь, тренировки, шаблоны, прогресс, питание, замеры,
  чат, push.
- CLIENT: календарь, выполнение тренировки, питание, отчёты и PDF, выбор
  тренера, чат, уведомления, профиль.
- Жизненный цикл тренировки: `PLANNED → IN_PROGRESS → COMPLETED`, а также
  `AUTO_CLOSED` через 2 часа и `MISSED` в 00:00 следующего дня по TZ клиента.
- Завершённые тренировки доступны только для чтения и свободно листаются.

## Структура

```
backend/      NestJS API, Prisma schema/migrations/seed, e2e-тесты
web-admin/    Веб-панель администратора и ресепшн (nginx + TLS)
mobile/       Flutter-приложение (тренер + клиент)
docs/         ТЗ, ER-модель, OpenAPI, инструкция по ключам RuStore
docker-compose.yml
Makefile
```

## Роли

| Роль | Интерфейс | Основные задачи |
| --- | --- | --- |
| `ADMIN` | web-admin | справочники, сотрудники, отчёты, настройки |
| `RECEPTION` | web-admin | клиенты и тренеры своего зала |
| `TRAINER` | mobile | клиенты, тренировки, шаблоны, прогресс, питание, чат |
| `CLIENT` | mobile | календарь, тренировка дня, питание, отчёты, чат |

Мобильное приложение поддерживает только `TRAINER` и `CLIENT`. Для другой роли
токены очищаются и показывается «Роль пользователя не поддерживается».

## Быстрый старт (Docker)

Требования: Docker + Compose, Node.js 20+ и pnpm для локальной разработки,
Flutter SDK для mobile.

```bash
cp .env.example .env
nano .env
make up
```

При старте backend применяет миграции и выполняет идемпотентный seed
(администратор из `ADMIN_PHONE`/`ADMIN_PASSWORD`, справочники и шаблоны).

Проверка:

```bash
curl -k https://127.0.0.1:3000/api/v1/health   # {"status":"ok"}
```

- Web-admin: `https://<host>:3000`
- Swagger: `https://<host>:3000/api/docs` (при `ENABLE_SWAGGER=true`)
- OpenAPI JSON: `https://<host>:3000/api/docs-json`
- Backend внутри Compose: `http://backend:8080`

Остановка:

```bash
make down
docker compose down -v   # с удалением БД
```

## Команды

| Команда | Действие |
| --- | --- |
| `make up` | собрать и запустить стек |
| `make down` | остановить контейнеры |
| `make migrate` | применить миграции Prisma |
| `make seed` | идемпотентный seed |
| `make test` | backend e2e на БД `gym_test` |
| `make logs` | логи backend |
| `make psql` | psql к БД |
| `make apply-server` | применить порт/настройки HTTPS |

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `POSTGRES_PASSWORD` | пароль PostgreSQL |
| `JWT_SECRET` | секрет access-токена (≥32 символов) |
| `JWT_REFRESH_SECRET` | секрет refresh-токена (≥32 символов) |
| `DEFAULT_CLIENT_PASSWORD` | начальный пароль клиентов/тренеров |
| `ADMIN_PHONE`, `ADMIN_PASSWORD` | администратор |
| `DEFAULT_TIMEZONE` | пояс по умолчанию, `Asia/Novosibirsk` |
| `REDIS_PASSWORD` | пароль Redis |
| `CORS_ORIGINS` | разрешённые origin веб-панели |
| `ENABLE_SWAGGER` | включает Swagger |
| `FCM_CREDENTIALS_JSON` | сервисный аккаунт Firebase (пусто = push выключен) |
| `WEB_ADMIN_PORT` | внешний HTTPS-порт (по умолчанию 3000) |

Секреты хранятся только в `.env`/`secrets/`; `.env`, `ssl/`,
`server-config/`, `uploads/`, keystore и `key.properties` не коммитятся.

## Mobile

- Адрес API по умолчанию: `https://demogym.staff-rf.ru:3000`.
- `/api/v1` добавляется автоматически; в коде хранится только хост.
- Адрес можно переопределить при сборке через `--dart-define=API_URL=...`.
- Версия: `1.0.8+9` (`versionName 1.0.8`, `versionCode 9`).
- applicationId: `com.gymapp.gym_trainer`.
- Release подписывается release-ключом. Параметры — в
  `mobile/android/key.properties` (не в git), keystore —
  `/opt/compose/keyAPP/app-key.keystore`.
- Инструкция по ключам, PEPK и RuStore: `docs/RUSTORE_KEY.md`.

```bash
cd mobile
flutter pub get
flutter analyze
flutter test

flutter build apk --release \
  --dart-define=API_URL=https://demogym.staff-rf.ru:3000
flutter build appbundle --release \
  --dart-define=API_URL=https://demogym.staff-rf.ru:3000
```

Артефакты:

- `mobile/build/app/outputs/flutter-apk/app-release.apk`
- `mobile/build/app/outputs/bundle/release/app-release.aab`

Проверка подписи и адреса:

```bash
apksigner verify --print-certs \
  mobile/build/app/outputs/flutter-apk/app-release.apk
sha256sum mobile/build/app/outputs/flutter-apk/app-release.apk \
  mobile/build/app/outputs/bundle/release/app-release.aab
```

## Backend

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm start:dev
pnpm build
```

- Глобальный префикс: `/api/v1`.
- JWT: access 15 минут, refresh 30 дней с ротацией.
- WebSocket чата: namespace `/chat`.
- Swagger: `/api/docs`, JSON `/api/docs-json`.
- Кэш и throttler — Redis; при недоступности Redis работает fallback.

## Web-admin

```bash
cd web-admin
pnpm install
pnpm dev
pnpm lint
pnpm build
```

В production nginx слушает HTTPS :3000, проксирует `/api/`, `/socket.io/`,
`/uploads/` на backend :8080 и отдаёт SPA.

## Тесты

```bash
make test                              # backend e2e, БД gym_test
cd mobile && flutter analyze && flutter test
cd web-admin && pnpm lint && pnpm build
```

E2E используют отдельную БД и не затрагивают рабочую. Полный прогон может быть
нестабилен из-за длительной очистки демо-данных; для приёмки допускаются
целевые наборы.

## Документация

- `docs/TZ.md` — техническое задание, план разработки, план приёмки,
  тест-план, бизнес-правила и реестр дефектов.
- `docs/er.md` — модель данных.
- `docs/api.md` — актуальная OpenAPI-спецификация.
- `docs/RUSTORE_KEY.md` — ключи подписи, PEPK, AAB и CSR для ОС Аврора.
- `docs/033_*` — задание, план, тесты и результат консолидации документации.

## Известные ограничения

- Push требует реальный сервисный аккаунт Firebase и физическое устройство.
- Чат рассчитан на один инстанс backend (без Redis pub/sub).
- Офлайн-режим, оплата и iOS — вне MVP.
- Restore архивного тренера не предусмотрен.
- UI-переключатели страниц в web-admin не реализованы (API готов).
- Новые залы не наполняются дефолтными тренажёрами автоматически.
- Полный e2e может быть нестабилен из-за демо-очистки.

## Диагностика

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web-admin
```

- `Invalid environment configuration` — проверьте обязательные env и что
  секреты не начинаются с `changeme`.
- `401` при входе в web-admin — проверьте `ADMIN_PHONE`/`ADMIN_PASSWORD` и
  логи seed.
- Ошибка TLS — проверьте сертификат в `ssl/staff-rf` или загруженный в
  `server-config/tls`, затем `make apply-server`.

---

Ноябрь 2026
