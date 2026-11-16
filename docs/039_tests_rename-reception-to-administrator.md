# 039 — Тесты: переименование Reception → Administrator

Дата: 2026-11-16

## Окружение

- Backend: NestJS + Prisma, PostgreSQL `gym`, Redis.
- Проверка миграции: временная БД `gym_migration_test` (создана и удалена).
- Деплой: Docker Compose, `https://demogym.staff-rf.ru:3000`.
- Mobile: Flutter, сборка `1.0.10+12`.

## Статические проверки и сборки

### Backend

```bash
cd backend
./node_modules/.bin/prisma format
./node_modules/.bin/prisma generate
pnpm build
```

Результат: успешно, ошибок нет. Prisma Client 6.19.3 сгенерирован.

### Web-admin

```bash
cd web-admin
./node_modules/.bin/oxlint
pnpm build
```

Результат:

- `oxlint`: 0 errors, 4 pre-existing warnings в `src/router.tsx:46,51,71,87`
  (`react(only-export-components)`, `react(set-state-in-effect)`).
- `tsc -b && vite build`: успешно, 1636 модулей, 883 ms.
- Предупреждение Vite: чанк 1 586 kB > 500 kB (было и раньше).

### Mobile

```bash
cd mobile
flutter analyze
flutter test
```

Результат:

- `flutter analyze`: **No issues found!** (4.8 s).
- `flutter test`: **25 passed**, 0 failed (9 s), включая M8–M18.

## Миграция БД

```bash
docker compose exec -T postgres createdb -U gym gym_migration_test
DATABASE_URL=postgresql://gym:<password>@127.0.0.1:5432/gym_migration_test \
  ./node_modules/.bin/prisma migrate deploy
```

Результат: применены все 12 миграций, включая
`20261116103000_rename_reception_to_administrator`; ошибок нет.

После деплоя:

```bash
docker compose exec -T backend npx prisma migrate status --schema prisma/schema.prisma
```

Результат: `Database schema is up to date!`

Проверки схемы:

```sql
SELECT enum_range(NULL::"Role");
SELECT to_regclass('"Administrator"'), to_regclass('"Reception"');
```

Результат:

- `Role = {ADMIN,TRAINER,CLIENT,ADMINISTRATOR}`;
- таблица `"Administrator"` существует, `"Reception"` отсутствует.

## Backend e2e

```bash
cd backend
set -a; . /opt/compose/gym-app/.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
export REDIS_HOST=127.0.0.1
export NODE_ENV=test
pnpm test:e2e --runInBand --forceExit
```

Результат:

```text
Test Suites: 34 passed, 34 total
Tests:       271 passed, 271 total
Snapshots:   0 total
Time:        63.24 s
```

Единственное сообщение в логе — ожидаемое
`PushService FCM credentials not found ... push disabled`.

Примечание: `demo.e2e-spec.ts` по своему сценарию вызывает `demo.clear()` и
удаляет демо-данные. После прогона демо-набор был повторно загружен через
`POST /admin/demo/load` (3 зала, 6 тренеров, 20 клиентов, 3 администратора,
780 тренировок). Для регулярных прогонов лучше использовать отдельную БД.

## API-smoke после деплоя

Проверено на `http://127.0.0.1:8080/api/v1`:

- вход ADMIN — 200;
- `GET /admin/gyms` — 3 зала;
- `POST /admin/administrators` (`+79990003901`) — 201;
- вход созданного администратора — 200, роль `ADMINISTRATOR`;
- `GET /administrator/gyms` — 200, зал `Демо-зал «Центральный»`;
- `GET /chats` — 200;
- `DELETE /admin/administrators/{id}` — 204;
- вход демо-администратора `+79995550201` — роль `ADMINISTRATOR`,
  `GET /administrator/gyms` — 200.

## Docker-деплой

```bash
docker compose up -d --build
```

Результат: образы `gym-app-backend` и `gym-app-web-admin` пересобраны;
контейнеры healthy. Проверки из контейнеров:

- backend `GET /api/v1/health` → `{"status":"ok"}`;
- web-admin HTTPS `/` → HTTP 200, HTML отдаётся.

## Mobile release

```bash
cd mobile
flutter build apk --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000
flutter build appbundle --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000
```

Результат:

- `app-release.apk`: 57.9 MiB, sha256
  `d272d1bb3fa4db82cdae176dff4f3add73098b3fd00e62a8eaf44934457c1ae3`;
- `app-release.aab`: 55.3 MiB, sha256
  `6897df5e65cdeef552acee8b99baee1429593d80e796a3c64d88bb03ac11d242`;
- `apkanalyzer`: version-name `1.0.10`, version-code `12`;
- предупреждение Gradle про `firebase_core` и Kotlin Gradle Plugin —
  не блокирует сборку (как и в 038).
