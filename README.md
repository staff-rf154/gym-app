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

## Быстрый старт (Docker)

```bash
cp .env.example .env
make up          # сборка и запуск postgres, redis, backend, web-admin
make migrate     # prisma migrate deploy
make seed        # создание администратора (идемпотентно)
```

Проверка:

- Backend health: `http://localhost:8080/api/v1/health` → `{"status":"ok"}`
- Swagger UI: `http://localhost:8080/api/docs`
- Web-admin: `http://localhost:3000`

Остановка: `make down`.

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

Основные модули: auth, gyms, equipment, upload, exercises, food-products, clients, trainers, client-trainers, weight-measurements, reports, workouts, nutrition, notifications, chats.

## Web-admin

```bash
cd web-admin
pnpm install
pnpm dev            # dev-сервер Vite
pnpm build          # production-сборка
pnpm lint           # oxlint
```

Разделы: логин, залы, тренажёры, упражнения, продукты питания, клиенты, тренеры, замеры веса, уведомления, чаты, настройки (часовой пояс).

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
- `docs/process.md` — статус работ, риски, последовательность

## Известные ограничения

- FCM push требует реальный `secrets/fcm.json` (сервисный аккаунт Firebase) и физическое устройство для боевой проверки.
- Чат рассчитан на один инстанс backend (без Redis pub/sub).
- Офлайн-режим и оплата — вне MVP.
- UI-smoke на физическом Android-устройстве выполняется вручную; в среде разработки эмулятор недоступен.
