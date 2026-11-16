# Gym App

Информационная система спортивного зала: администраторы работают в
веб-панели, тренер и клиент — в едином Android-приложении.

- Backend: NestJS 10 + Prisma 6 + PostgreSQL 16 + Redis 7.
- Web-admin: React 19 + Vite + Ant Design 6.
- Mobile: Flutter, одно приложение для тренера и клиента.
- Внешний вход: HTTPS `https://demogym.staff-rf.ru:3000`.
- API: `https://demogym.staff-rf.ru:3000/api/v1`.
- Документация API: Swagger `/api/docs`, JSON `/api/docs-json`.

## Содержание

1. [Что это](#что-это)
2. [Архитектура](#архитектура)
3. [Состав репозитория](#состав-репозитория)
4. [Роли и доступ](#роли-и-доступ)
5. [Функциональные модули](#функциональные-модули)
6. [Модель данных](#модель-данных)
7. [Быстрый старт (Docker)](#быстрый-старт-docker)
8. [Переменные окружения](#переменные-окружения)
9. [Локальная разработка](#локальная-разработка)
10. [Backend](#backend)
11. [Web-admin](#web-admin)
12. [Mobile](#mobile)
13. [База данных](#база-данных)
14. [Тесты](#тесты)
15. [Релиз и деплой](#релиз-и-деплой)
16. [Диагностика](#диагностика)
17. [Безопасность](#безопасность)
18. [Известные ограничения](#известные-ограничения)
19. [Правила разработки](#правила-разработки)
20. [Документация](#документация)

## Что это

Gym App закрывает полный цикл работы зала:

- ведение залов, тренажёров, упражнений, продуктов питания и целей;
- клиенты, тренеры, администраторы залов и связи между ними;
- шаблоны тренировок и назначение тренировок на календарь;
- выполнение тренировки клиентом, результаты по упражнениям, авто-закрытие;
- замеры веса и состава тела, динамика веса;
- отчёты по посещаемости, оборудованию, тренерам, упражнениям и весу;
- экспорт отчётов в PDF;
- питание и рекомендации тренера;
- чаты клиент↔тренер, клиент↔администратор, тренер↔администратор,
  тренер↔системный администратор;
- уведомления и push через Firebase;
- фоновые операции через очередь на Redis.

Система рассчитана на несколько залов. Данные клиентов, тренеров и
администраторов изолированы по залам; роль `ADMIN` видит систему целиком.

## Архитектура

```
Android (TRAINER/CLIENT)            Браузер (ADMIN/ADMINISTRATOR)
            |                                  |
            | HTTPS                            | HTTPS :3000
            v                                  v
     +------------------------------------------------+
     | nginx (web-admin): TLS, SPA, /api/, /socket.io/ |
     +----------------------+-------------------------+
                            |
                            v
                 +---------------------+
                 | backend :8080       |
                 | NestJS + Prisma     |
                 +----+-----------+----+
                      |           |
                      v           v
              PostgreSQL 16    Redis 7
              (pgdata)         (кэш, throttler, очередь)
                      |
                      v
              uploads/, secrets/,
              server-config/, ssl/
```

Потоки:

- Web-admin и mobile ходят в один backend через `/api/v1`.
- nginx проксирует `/api/`, `/socket.io/`, `/uploads/` на backend и
  отдаёт собранный SPA.
- WebSocket чата работает в namespace `/chat`.
- При старте backend применяет миграции Prisma и выполняет идемпотентный
  seed.
- Тяжёлые операции (demo load/clear, массовые уведомления) выполняются
  через очередь в Redis с последовательной обработкой.

## Состав репозитория

```
backend/                  NestJS API
  prisma/
    schema.prisma         модель данных
    migrations/           миграции
    seed.ts               идемпотентный seed
  src/
    administrator/        кабинет администратора зала
    administrators/       управление администраторами (ADMIN)
    auth/                 JWT, refresh, роли
    chats/                REST + WebSocket чаты
    client-trainers/      связи клиент—тренер
    clients/              клиенты
    common/               guards, decorators, timezone
    dashboard/            статистика дашборда
    default-config/       значения по умолчанию
    demo/                 демо-данные
    equipment/            оборудование залов
    exercises/            упражнения
    food-products/        продукты питания
    goals/                цели
    gym-links/            связи с залами
    gyms/                 залы
    health/               health-check
    notifications/        уведомления и FCM
    nutrition/            питание
    prisma/               PrismaService
    queue/                очередь фоновых операций
    redis/                кэш и инвалидация
    reports/              отчёты и PDF
    server-settings/      настройки сервера и TLS
    trainer-clients/      клиенты тренера
    trainers/             тренеры
    upload/               загрузка файлов
    weight-measurements/  замеры веса
    workouts/             тренировки, шаблоны, календарь
web-admin/                React SPA + nginx
mobile/                   Flutter Android
docs/                     ТЗ, ER, OpenAPI, журналы заданий
postgres-config/          postgresql.conf, pg_hba.conf
secrets/                  FCM и прочие секреты (не в git)
server-config/            настройки сервера, TLS
ssl/                      сертификаты (не в git)
uploads/                  загруженные файлы
docker-compose.yml
Makefile
```

## Роли и доступ

| Роль | Интерфейс | Основные задачи |
| --- | --- | --- |
| `ADMIN` | web-admin | вся система: залы, справочники, сотрудники, связи, отчёты, настройки сервера |
| `ADMINISTRATOR` | web-admin | клиенты, тренеры и связи только своего зала, замеры, сброс паролей, шаблоны зала, уведомления |
| `TRAINER` | mobile | клиенты, календарь, тренировки, шаблоны, прогресс, питание, замеры, чат, push |
| `CLIENT` | mobile | календарь, тренировка дня, питание, отчёты и PDF, выбор тренера, чат, уведомления, профиль |

Матрица доступа по ключевым разделам:

| Раздел | ADMIN | ADMINISTRATOR | TRAINER | CLIENT |
| --- | --- | --- | --- | --- |
| Залы и оборудование | полный | свой зал | просмотр | — |
| Упражнения, продукты, цели | полный | справочники | чтение | чтение |
| Клиенты | все | свой зал | свои | свой профиль |
| Тренеры | все | свой зал | свой профиль | свой тренер |
| Администраторы залов | все | — | — | — |
| Шаблоны тренировок | все | свой зал | свои | — |
| Тренировки и календарь | все | свой зал | свои | свои |
| Замеры веса | все | свой зал | свои клиенты | свои |
| Отчёты | все | свой зал | свои клиенты | свои данные |
| PDF-отчёты | все | свой зал | свои клиенты | свои данные |
| Чаты | все | свой зал | клиенты, администраторы | тренер, администратор |
| Рассылки и push | все | свой зал | — | — |
| Настройки сервера | полный | — | — | — |

Мобильное приложение поддерживает только `TRAINER` и `CLIENT`. Для другой
роли токены очищаются и показывается «Роль пользователя не поддерживается».

Жизненный цикл тренировки:

```
PLANNED -> IN_PROGRESS -> COMPLETED
        \-> AUTO_CLOSED (через 2 часа после начала)
        \-> MISSED (в 00:00 следующего дня по TZ клиента)
```

Завершённые тренировки доступны только для чтения и свободно листаются.

## Функциональные модули

### Backend-модули

| Модуль | Назначение |
| --- | --- |
| `auth` | вход по телефону и паролю, access/refresh JWT, роли |
| `clients`, `trainers`, `administrator`, `administrators` | сотрудники и клиенты |
| `gyms`, `equipment` | залы и оборудование |
| `exercises`, `food-products`, `goals` | справочники |
| `trainer-clients`, `client-trainers`, `gym-links` | связи сущностей |
| `workouts` | шаблоны, календарь, тренировки, результаты |
| `weight-measurements` | замеры веса и состава тела |
| `nutrition` | питание и рекомендации |
| `reports` | отчёты и PDF |
| `dashboard` | сводка для дашборда |
| `chats` | REST и WebSocket чаты |
| `notifications` | уведомления, получатели, FCM |
| `demo`, `queue` | демо-данные и фоновые операции |
| `server-settings`, `upload` | настройки сервера и файлы |
| `redis` | кэш, инвалидация, throttler |

### Отчёты

Базовый путь: `/api/v1/reports`.

| Отчёт | Эндпоинт | Роли |
| --- | --- | --- |
| Динамика веса | `GET /weight-dynamics` | CLIENT, TRAINER, ADMINISTRATOR, ADMIN |
| Прогресс упражнения | `GET /exercise-progress` | CLIENT, TRAINER, ADMINISTRATOR, ADMIN |
| Сводка упражнений | `GET /exercises-summary` | CLIENT, TRAINER, ADMINISTRATOR, ADMIN |
| Посещаемость | `GET /attendance` | TRAINER, ADMINISTRATOR, ADMIN |
| Использование оборудования | `GET /equipment-usage` | TRAINER, ADMINISTRATOR, ADMIN |
| Отчёт по тренерам | `GET /trainers` | TRAINER, ADMINISTRATOR, ADMIN |

Общие параметры:

- `from`, `to` — границы периода (`YYYY-MM-DD`);
- `client_id`, `trainer_id`, `gym_id` — фильтры с проверкой доступа;
- `group_by` — группировка (`day`/`week`/`month`, для оборудования —
  `type`/`equipment`/`client`).

PDF:

| PDF | Эндпоинт |
| --- | --- |
| Вес | `GET /reports/pdf/weight` |
| Упражнения | `GET /reports/pdf/exercises` |
| Посещаемость | `GET /reports/pdf/attendance` |
| Оборудование | `GET /reports/pdf/equipment` |
| Тренеры | `GET /reports/pdf/trainers` |

PDF-эндпоинты принимают `period`:

- `week` — текущая неделя;
- `previousWeek` — прошлая неделя;
- `month` — текущий месяц;
- `3months` — три месяца;
- `year` — год;
- `custom` — вместе с `from`/`to`.

Ответ: `Content-Type: application/pdf`,
`Content-Disposition: attachment`, `Content-Length`.

### Дашборд

`GET /api/v1/admin/dashboard/stats` — только `ADMIN` и `ADMINISTRATOR`.
Отдаёт сводку за период: посещаемость, тренировки, клиенты, тренеры,
оборудование. Используется карточками и таблицей на главной странице
web-admin.

### Чаты

REST: `/api/v1/chats`

- `GET /chats` — список чатов пользователя;
- `GET /chats/staff` — доступные собеседники;
- `POST /chats` — создать или получить чат;
- `GET /chats/:id/messages` — история;
- `POST /chats/:id/messages` — отправить сообщение;
- `POST /chats/:id/read` — отметить прочитанным.

WebSocket: namespace `/chat`.

- `chat:join` — подписаться на чат;
- `chat:leave` — отписаться;
- `chat:send` — отправить сообщение;
- `chat:message` — событие нового сообщения.

Доступные пары:

- клиент ↔ тренер;
- клиент ↔ администратор зала;
- тренер ↔ администратор зала;
- тренер ↔ системный администратор.

В ответах чата передаётся `peerRole`, чтобы интерфейс показывал роль
собеседника.

### Уведомления и push

- Уведомление создаётся для набора получателей.
- В inbox хранятся типы уведомлений и признак прочтения.
- Push отправляется через Firebase Admin SDK, если задан
  `FCM_CREDENTIALS_JSON` или файл `backend/secrets/fcm.json`.
- Если credentials нет, backend пишет предупреждение
  `FCM credentials not found ... push disabled` и продолжает работу.

### Очередь фоновых операций

Реализация: `backend/src/queue/sync-queue.service.ts` на Redis.

- Ключи: `queue:sync:pending`, `queue:sync:processing`,
  `queue:sync:result:<job_id>`.
- Обработка последовательная (concurrency 1), результат живёт 120 секунд,
  ожидание — до 30 секунд.
- При недоступности Redis или `ENABLE_SYNC_QUEUE=false` операции
  выполняются последовательно в процессе backend.
- Используется для demo load/clear и массовых рассылок уведомлений.
- Массовые записи выполняются чанками, чтобы не блокировать БД.

## Модель данных

Полная модель — `docs/er.md`. Основные сущности:

- `User` — учётная запись, телефон, пароль, роль, TZ, push-токен.
- `Gym`, `GymEquipment` — зал и его оборудование.
- `Exercise`, `FoodProduct`, `Goal` — справочники.
- `Client`, `Trainer`, `Administrator` — профили ролей.
- `ClientTrainer`, `TrainerGym`, `ClientGym` — связи и изоляция по залам.
- `WeightMeasurement` — замеры веса и состава тела.
- `WorkoutTemplate`, `WorkoutTemplateItem` — шаблоны.
- `Workout`, `WorkoutItem`, `WorkoutItemResult` — тренировка, упражнения,
  фактические результаты.
- `NutritionRecommendation` — рекомендации по питанию.
- `Chat`, `Message` — чаты и сообщения.
- `Notification`, `NotificationRecipient` — уведомления.
- `RefreshToken` — refresh-токены с ротацией.

Правила Prisma:

- `DateTime` → `@db.Timestamptz`;
- `Workout.date` → `@db.Date`;
- изменения схемы сопровождаются миграцией и записью в `docs/er.md`.

## Быстрый старт (Docker)

Требования:

- Docker Engine и Docker Compose v2;
- Node.js 20+ и pnpm — для локальной разработки;
- Flutter SDK — для mobile.

Запуск:

```bash
cp .env.example .env
nano .env
make up
```

`make up` собирает образы и поднимает `postgres`, `redis`, `backend`,
`web-admin`. Backend при старте:

1. применяет `prisma migrate deploy`;
2. выполняет `prisma db seed`;
3. запускает `node dist/src/main.js`.

Проверка:

```bash
curl -k https://127.0.0.1:3000/api/v1/health   # {"status":"ok"}
curl http://127.0.0.1:8080/api/v1/health        # {"status":"ok"}
```

Адреса:

- Web-admin: `https://<host>:3000`
- Swagger: `https://<host>:3000/api/docs` (при `ENABLE_SWAGGER=true`)
- OpenAPI JSON: `https://<host>:3000/api/docs-json`
- Backend внутри Compose: `http://backend:8080`
- PostgreSQL: `127.0.0.1:5432` (только localhost)
- Redis: `127.0.0.1:6379` (только localhost)

Остановка:

```bash
make down
docker compose down -v   # с удалением БД
```

Полезные команды:

| Команда | Действие |
| --- | --- |
| `make up` | собрать и запустить стек |
| `make down` | остановить контейнеры |
| `make migrate` | применить миграции Prisma |
| `make seed` | идемпотентный seed |
| `make test` | backend e2e на БД `gym_test` |
| `make logs` | логи backend |
| `make psql` | psql к БД `gym` |
| `make apply-server` | применить порт/настройки HTTPS |

## Переменные окружения

Обязательные:

| Переменная | Назначение |
| --- | --- |
| `POSTGRES_PASSWORD` | пароль PostgreSQL |
| `JWT_SECRET` | секрет access-токена, ≥32 символов |
| `JWT_REFRESH_SECRET` | секрет refresh-токена, ≥32 символов |
| `ADMIN_PHONE` | телефон системного администратора |
| `ADMIN_PASSWORD` | пароль системного администратора |
| `DEFAULT_CLIENT_PASSWORD` | начальный пароль клиентов и тренеров |
| `DEFAULT_TIMEZONE` | пояс по умолчанию, например `Asia/Novosibirsk` |

Дополнительные:

| Переменная | Назначение |
| --- | --- |
| `REDIS_PASSWORD` | пароль Redis |
| `REDIS_URL` | явный URL Redis, приоритетнее host/port |
| `REDIS_HOST`, `REDIS_PORT` | адрес Redis, по умолчанию `127.0.0.1:6379` |
| `CORS_ORIGINS` | разрешённые origin через запятую |
| `ENABLE_SWAGGER` | включает Swagger, по умолчанию включён |
| `FCM_CREDENTIALS_JSON` | сервисный аккаунт Firebase, пусто = push выключен |
| `WEB_ADMIN_PORT` | внешний HTTPS-порт web-admin, по умолчанию 3000 |
| `PORT` | порт backend, по умолчанию 8080 |
| `ENABLE_SYNC_QUEUE` | `false` отключает очередь и включает локальный fallback |
| `SERVER_CONFIG_DIR` | каталог настроек сервера |
| `SSL_DIR` | каталог сертификатов TLS |
| `ADMINISTRATOR_PHONE`, `ADMINISTRATOR_PASSWORD`, `ADMINISTRATOR_GYM_ID` | необязательный администратор зала для seed |

Правила:

- значения секретов не должны начинаться с `changeme` — backend откажется
  стартовать;
- `JWT_SECRET` и `JWT_REFRESH_SECRET` короче 32 символов недопустимы;
- секреты хранятся только в `.env` и `secrets/`;
- `.env`, `ssl/`, `server-config/`, `uploads/`, keystore и
  `key.properties` не коммитятся.

## Локальная разработка

### Backend

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm start:dev
```

Для локального запуска нужны `DATABASE_URL` и остальные переменные из
`.env`; удобно экспортировать их из корневого файла:

```bash
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
```

Сборка и запуск production-кода:

```bash
pnpm build
pnpm start:prod
```

### Web-admin

```bash
cd web-admin
pnpm install
pnpm dev
```

Vite проксирует `/api` и `/uploads` на `http://localhost:8080`, поэтому
backend должен быть запущен локально.

### Mobile

```bash
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_URL=https://demogym.staff-rf.ru:3000
```

## Backend

### API и аутентификация

- Глобальный префикс: `/api/v1`.
- Авторизация: `Authorization: Bearer <access_token>`.
- Access-токен: 15 минут.
- Refresh-токен: 30 дней, хранится в БД, ротируется при обновлении.
- Refresh передаётся в httpOnly cookie `refresh_token` или в теле запроса.
- Cookie `Secure` выставляется только для HTTPS-запросов.
- Пароли хранятся в bcrypt-хеше.
- Роли проверяются guard-ом и декоратором `@Roles(...)`.

### Валидация и безопасность

- `ValidationPipe`: `whitelist`, `forbidNonWhitelisted`, `transform`.
- Helmet для security-заголовков.
- CORS только для origin из `CORS_ORIGINS`.
- Ограничение частоты запросов через `@nestjs/throttler` и Redis.
- Ошибки доступа к чужому залу или клиенту — `403`.
- Загрузка файлов ограничена по размеру и типу.

### Кэш и Redis

- Кэш отчётов и части чтений — Redis.
- При недоступности Redis backend работает через fallback.
- Инвалидация кэша выполняется интерсептором после изменений.
- Очередь фоновых операций использует тот же Redis.

### Статика и файлы

- `uploads/` монтируется в контейнер и отдаётся через backend.
- `secrets/` монтируется только на чтение.
- `server-config/` и `ssl/` используются настройками сервера и nginx.
- Шрифт PDF ищется относительно backend, поэтому PDF работает независимо
  от рабочего каталога процесса.

## Web-admin

Стек: React 19, React Router 7, TanStack Query, Zustand, Ant Design 6,
axios, dayjs.

Основные маршруты:

- `/login` — вход;
- `/protected/dashboard` — дашборд;
- `/protected/trainers`, `/protected/clients` — сотрудники и клиенты;
- `/protected/clients/:id/weight` — замеры клиента;
- `/protected/goals`, `/protected/exercises`, `/protected/products` —
  справочники;
- `/protected/gyms`, `/protected/gyms/:id/equipment`,
  `/protected/equipment` — залы и оборудование;
- `/protected/templates` — шаблоны;
- `/protected/reports/attendance`,
  `/protected/reports/equipment`, `/protected/reports/trainers` — отчёты;
- `/protected/notifications` — рассылки;
- `/protected/chats` — чаты;
- `/protected/settings` — настройки сервера;
- `/protected/administrators` — администраторы (ADMIN);
- `/protected/administrator/clients`,
  `/protected/administrator/trainers`,
  `/protected/administrator/templates` — кабинет администратора зала.

На всех защищённых страницах сверху закреплён блок `QuickActions` с
быстрыми действиями, доступными роли.

Сборка:

```bash
cd web-admin
pnpm lint
pnpm build
```

В production nginx слушает HTTPS :3000, проксирует `/api/`, `/socket.io/`,
`/uploads/` на backend :8080 и отдаёт SPA.

## Mobile

- Одно приложение для `TRAINER` и `CLIENT`; роль определяется при входе.
- Версия: `1.0.10+12` (`versionName 1.0.10`, `versionCode 12`).
- applicationId: `com.gymapp.gym_trainer`.
- API по умолчанию: `https://demogym.staff-rf.ru:3000`.
- `API_URL` задаёт хост; `/api/v1` добавляется автоматически.
- Адрес можно изменить при сборке через
  `--dart-define=API_URL=https://host:port`.
- В приложении есть экран смены сервера; сохранённый адрес версионируется.
- Release подписывается release-ключом. Параметры —
  `mobile/android/key.properties` (не в git), keystore —
  `/opt/compose/keyAPP/app-key.keystore`.
- Инструкция по ключам, PEPK и RuStore — `docs/RUSTORE_KEY.md`.

Сборка:

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

Проверка подписи и контрольных сумм:

```bash
apksigner verify --print-certs \
  mobile/build/app/outputs/flutter-apk/app-release.apk
sha256sum mobile/build/app/outputs/flutter-apk/app-release.apk \
  mobile/build/app/outputs/bundle/release/app-release.aab
```

Возможности mobile:

- календарь и тренировка дня;
- выполнение упражнений и сохранение результатов;
- шаблоны тренировок;
- вес, прогресс и PDF-отчёты;
- питание;
- чаты;
- уведомления и push;
- профиль и настройки.

Периоды отчётов и списков: текущая неделя, прошлая неделя, месяц,
3 месяца, год, произвольный диапазон.

## База данных

- PostgreSQL 16, база `gym`, пользователь `gym`.
- Данные лежат в Docker volume `pgdata`.
- Конфигурация: `postgres-config/postgresql.conf`,
  `postgres-config/pg_hba.conf`.
- Схема: `backend/prisma/schema.prisma`.
- Миграции: `backend/prisma/migrations/`.

Применить миграции:

```bash
make migrate
# или
docker compose exec backend npx prisma migrate deploy
```

Seed:

```bash
make seed
# или
docker compose exec backend npx prisma db seed
```

Seed идемпотентный: создаёт администратора из env, справочники и шаблоны,
не дублируя записи.

Подключиться к БД:

```bash
make psql
# или
docker compose exec postgres psql -U gym -d gym
```

Резервная копия:

```bash
docker compose exec -T postgres pg_dump -U gym -d gym > backup.sql
```

Восстановление:

```bash
cat backup.sql | docker compose exec -T postgres psql -U gym -d gym
```

Полный сброс:

```bash
docker compose down -v
make up
```

## Тесты

### Backend e2e

```bash
make test
```

Или напрямую:

```bash
cd backend
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
export ENABLE_SYNC_QUEUE=false
pnpm exec jest --config jest.config.js --runInBand \
  --testPathPattern "\.e2e-spec\.ts$"
```

Текущий полный прогон: 36 suites / 283 tests passed.

Целевые наборы:

```bash
pnpm exec jest --config jest.config.js --runInBand \
  --testPathPattern "src/reports/.*\.e2e-spec\.ts$"
pnpm exec jest --config jest.config.js --runInBand \
  --testPathPattern "src/chats/.*\.e2e-spec\.ts$"
```

E2E используют отдельную БД `gym_test` и не затрагивают рабочую. Тесты
чат-WebSocket, очереди и FCM требуют доступных Redis/сети; для локальных
прогонов допускается `ENABLE_SYNC_QUEUE=false`.

Предупреждения `FCM credentials not found ... push disabled` ожидаемы без
Firebase и не являются ошибкой.

### Web-admin

```bash
cd web-admin
pnpm lint
pnpm build
```

### Mobile

```bash
cd mobile
flutter analyze
flutter test
```

Текущий прогон: `flutter analyze` без замечаний, `flutter test` — 25 тестов.

## Релиз и деплой

### Backend и web-admin

```bash
git pull
make up
docker compose ps
curl -k https://127.0.0.1:3000/api/v1/health
```

`make up` пересобирает образы и перезапускает изменённые контейнеры.
Backend сам применяет миграции и seed.

### TLS и порт

- Сертификаты: `ssl/` или каталог, загруженный в `server-config/tls`.
- Настройки сервера: `server-config/server-settings.json`.
- После смены порта или TLS:

```bash
make apply-server
```

### Mobile

1. Обновить `version` в `mobile/pubspec.yaml`.
2. Собрать APK и AAB с production `API_URL`.
3. Проверить подпись и sha256.
4. Загрузить AAB в RuStore по инструкции `docs/RUSTORE_KEY.md`.

### Чек-лист релиза

- [ ] backend build и e2e зелёные;
- [ ] web-admin lint и build зелёные;
- [ ] flutter analyze и test зелёные;
- [ ] миграции применены;
- [ ] контейнеры healthy;
- [ ] health и PDF проверены;
- [ ] APK/AAB собраны и подписаны;
- [ ] `docs/<номер>_tests_*` и `docs/<номер>_result_*` заполнены;
- [ ] изменения закоммичены и отправлены.

## Диагностика

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f web-admin
docker compose logs -f postgres
docker compose logs -f redis
```

| Симптом | Что проверить |
| --- | --- |
| `Invalid environment configuration` | обязательные env, длина JWT-секретов, отсутствие `changeme` |
| `401` при входе в web-admin | `ADMIN_PHONE`/`ADMIN_PASSWORD`, лог seed, применена ли миграция |
| `403` в отчёте | роль, `gym_id`, связь `TrainerGym`, принадлежность клиента |
| PDF не скачивается | `Content-Disposition`, шрифт PDF, лог backend |
| Ошибка TLS | сертификат в `ssl/` или `server-config/tls`, затем `make apply-server` |
| Push не приходит | `FCM_CREDENTIALS_JSON`, `secrets/fcm.json`, токен устройства |
| Чат не обновляется | `/socket.io/` в nginx, namespace `/chat`, CORS |
| Очередь не работает | Redis healthy, `ENABLE_SYNC_QUEUE`, ключи `queue:sync:*` |
| БД недоступна | `docker compose ps`, healthcheck postgres, `DATABASE_URL` |

## Безопасность

- Не коммитить `.env`, `secrets/`, `ssl/`, `server-config/`, `uploads/`,
  keystore и `key.properties`.
- Использовать длинные случайные JWT-секреты и пароли БД/Redis.
- Ограничивать `CORS_ORIGINS` конкретными доменами.
- Не выдавать роль `ADMIN` без необходимости.
- Проверять принадлежность клиента, тренера и зала на backend, а не только
  в UI.
- Регулярно делать backup PostgreSQL и проверять восстановление.
- Обновлять базовые образы `node:20-alpine`, `nginx`, `postgres`, `redis`.
- Для production использовать HTTPS и не публиковать PostgreSQL/Redis
  наружу.

## Известные ограничения

- Push требует реальный сервисный аккаунт Firebase и физическое устройство.
- Чат рассчитан на один инстанс backend: Redis pub/sub для WebSocket не
  используется.
- Офлайн-режим, оплата и iOS — вне MVP.
- Restore архивного тренера не предусмотрен.
- UI-переключатели страниц в web-admin не реализованы (API готов).
- Новые залы не наполняются дефолтными тренажёрами автоматически.
- Полный e2e-прогон требует доступных PostgreSQL и Redis; часть тестов
  зависит от сетевого окружения.
- Очередь последовательная (concurrency 1); её цель — не пропускная
  способность, а защита БД от параллельных тяжёлых записей.

## Правила разработки

Проект следует `AGENTS.md`:

- каждое задание фиксируется в `docs/` до начала работы;
- для задания создаются `docs/<номер>_task_*`, при необходимости
  `docs/<номер>_plan_*`, затем `docs/<номер>_tests_*` и
  `docs/<номер>_result_*`;
- изменения функционала, API, интерфейса, конфигурации и схемы данных
  записываются в `docs/readme.md`;
- вопросы и ответы — `docs/verdikt#.md`, ошибки — `docs/bug#.md`;
- модели и эндпоинты сверяются с `docs/er.md` и `docs/api.md`;
- `DateTime` в Prisma — `@db.Timestamptz`, `Workout.date` — `@db.Date`;
- e2e-тесты пишутся в отдельном `*.e2e-spec.ts`;
- для Update DTO используется `PartialType`;
- один модуль — один чат, соседние модули без необходимости не трогаются.

Типовой цикл:

```text
задание -> task -> plan -> код -> tests -> readme -> result -> commit/push
```

## Документация

- `docs/TZ.md` — техническое задание, план разработки, план приёмки,
  тест-план, бизнес-правила и реестр дефектов.
- `docs/er.md` — модель данных и миграции.
- `docs/api.md` — актуальная OpenAPI-спецификация.
- `docs/readme.md` — журнал изменений функционала по заданиям.
- `docs/RUSTORE_KEY.md` — ключи подписи, PEPK, AAB и CSR для RuStore.
- `docs/0xx_*` — задания, планы, тесты и результаты по номерам.
- `AGENTS.md` — обязательные правила проекта.

---

Ноябрь 2026
