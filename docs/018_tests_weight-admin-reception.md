# Тесты 018 — замеры веса для ADMIN и RECEPTION

## Команда

Запуск из `backend/` с переменными окружения (на хосте `DATABASE_URL`
указывает на локальный PostgreSQL, а не на docker-хост `postgres`):

```bash
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
pnpm test:e2e
```

## Результат

- `weight-measurements.e2e-spec.ts`: 14 passed / 0 failed.
- Полный e2e: 24 suites, 188 passed / 0 failed, 29.0 s.
- Добавлены проверки: ADMIN POST 201 (`measuredBy=adminId`), ADMIN GET 200,
  RECEPTION POST/GET своего зала 201/200, RECEPTION чужого зала 403.
- `backend: pnpm build` — успешно.
- `web-admin: pnpm build` — успешно (предупреждение о размере чанка).
- `web-admin: pnpm lint` — 0 ошибок, 4 ранее известных предупреждения.

Замечание: push-уведомления в тестах отключены (нет FCM credentials) —
ожидаемое сообщение, на результаты не влияет.
