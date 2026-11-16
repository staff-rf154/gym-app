# 040 — Тесты

Дата: 2026-11-16
Задание: `docs/040_task_dashboard-reports-mobile-sync.md`

## Команды и результаты

### Backend: сборка

```bash
cd backend
pnpm build
```

Результат: PASS (nest build без ошибок).

### Backend: e2e

```bash
cd backend
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
export ENABLE_SYNC_QUEUE=false
pnpm exec jest --config jest.config.js --runInBand --testPathPattern "\.e2e-spec\.ts$"
```

Результат: PASS — 36 suites / 283 tests, 0 failed, 0 skipped, ~61.6 s.

Отдельно отчёты:

```bash
pnpm exec jest --config jest.config.js --runInBand \
  --testPathPattern "src/reports/.*\.e2e-spec\.ts$"
```

Результат: PASS — 5 suites / 56 tests, 0 failed, ~12.7 s.

Новые сценарии 040:

- `backend/src/dashboard/dashboard.e2e-spec.ts` — сводка дашборда, роли,
  период.
- `backend/src/queue/sync-queue.e2e-spec.ts` — очередь, идемпотентность,
  concurrency, результат по `job_id`.
- `backend/src/chats/chats-administrator.e2e-spec.ts` — чат тренера с
  администратором зала и системным администратором, `peerRole`.
- `backend/src/workouts/workouts-calendar.e2e-spec.ts` — облегчённый
  календарь, период, доступ по ролям.
- `backend/src/reports/reports.e2e-spec.ts` — PDF всех отчётов,
  `previousWeek`, `from/to` для прогресса и сводки упражнений.

Ошибка, найденная и исправленная при прогоне: тест
`GET /reports/pdf/attendance → application/pdf` получал 403, потому что в
`beforeAll` не создавалась связь `TrainerGym`. Добавлено создание и
удаление `TrainerGym` в тесте; после этого 56/56 тестов отчётов зелёные.
Предупреждения `[PushService] FCM credentials not found` ожидаемы для
локального окружения и на результат не влияют.

### Web-admin: линтер и сборка

```bash
cd web-admin
pnpm lint
pnpm build
```

Результат:

- `pnpm lint` — 4 предупреждения в `web-admin/src/router.tsx`
  (строки 46, 51, 71 — `only-export-components`; строка 87 —
  `set-state-in-effect`), ошибок нет.
- `pnpm build` — PASS, `tsc -b && vite build`; бандл 1 600.18 kB,
  предупреждение Vite о размере чанка > 500 kB.

### Mobile: анализ и тесты

```bash
cd mobile
flutter analyze
flutter test
```

Результат:

- `flutter analyze` — No issues found.
- `flutter test` — All tests passed, 25 tests.
  Покрыты `matchesWorkoutPeriod` (включая `previousWeek`) и smoke-тесты
  экранов M8–M18.

### Mobile: релизная сборка

```bash
cd mobile
flutter build apk --release
flutter build appbundle --release
```

Результат:

- `build/app/outputs/flutter-apk/app-release.apk` — 60.8 MB.
- `build/app/outputs/bundle/release/app-release.aab` — 58.0 MB.
- Предупреждения о Built-in Kotlin и запуске от root ожидаемы для
  сборочного окружения, сборка завершилась успешно.

### Docker Compose: релиз и smoke

```bash
docker compose build backend web-admin
docker compose up -d
docker compose ps
```

Результат: образы пересобраны, контейнеры `backend`, `web-admin`,
`postgres`, `redis` — healthy.

Smoke:

- `GET /api/v1/health` → 200.
- PDF (`GET /api/v1/reports/pdf/{attendance,equipment,trainers}?period=month`,
  роль ADMIN) → 200, `%PDF-`, размеры 8.9–9.1 kB.
- `weight` и `exercises` вернули 400 `client_id is required`, так как в
  рабочей БД на момент проверки не было клиентов; эти PDF покрыты
  e2e-тестами с тестовыми клиентами (56/56 passed).

## Итог

| Проверка | Результат |
| --- | --- |
| backend build | PASS |
| backend e2e | 36 suites / 283 tests PASS |
| reports e2e | 5 suites / 56 tests PASS |
| web-admin lint | 4 warnings, 0 errors |
| web-admin build | PASS |
| flutter analyze | PASS |
| flutter test | 25 PASS |
| flutter build apk/aab | PASS (60.8 MB / 58.0 MB) |
| Docker Compose | 4/4 healthy |
| PDF smoke | 3/3 доступных 200 `%PDF-` |
