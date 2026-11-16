# 035 — Тесты: уведомления при запуске и «Текущая неделя»

Дата: 2026-11-15

## Команды и результаты

### Backend e2e (целевые наборы)

```bash
docker compose exec -T backend pnpm test:e2e -- notifications.e2e-spec.ts reports.e2e-spec.ts
```

- Suites: 2 passed, 2 total
- Tests: 24 passed, 24 total
- Time: 13.682 s
- Ошибки: только ожидаемое `PushService`-предупреждение об отсутствии FCM
  credentials (`push disabled`).

Проверено:
- inbox и прочтение для всех ролей, рассылка ADMIN, фильтрация по залу;
- события `WORKOUT/MESSAGE/CHAT/NUTRITION` с `type/entityId`;
- новый тест `GET /reports/pdf/weight` без `period` → неделя по умолчанию
  (200, `application/pdf`, `%PDF`).

### Backend typecheck

```bash
docker compose exec -T backend pnpm exec tsc --noEmit
```

- Ошибок нет.

### Mobile

```bash
cd mobile && flutter analyze
cd mobile && flutter test
```

- analyze: `No issues found!` (4.4 s)
- test: 25 passed, 0 failed (включая новый
  `matchesWorkoutPeriod this week is Monday–Sunday` и smoke M13 —
  уведомление видно и отмечается прочитанным).

### Web-admin

```bash
cd web-admin && ./node_modules/.bin/oxlint
cd web-admin && pnpm build
```

- oxlint: exit 0, только pre-existing warnings `react(only-export-components)`
  и `react(set-state-in-effect)` в `src/router.tsx`.
- build: успешно, 1636 modules, 807 ms; предупреждение Vite о размере чанка
  >500 kB (pre-existing, без code-splitting).

## Итог

- passed: 24 backend e2e + 25 mobile unit/smoke + typecheck + web lint/build
- failed: 0
- skipped: 0
