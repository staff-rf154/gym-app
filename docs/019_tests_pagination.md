# Тесты 019 — пагинация списков

## Команда

```bash
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
pnpm test:e2e
```

## Результат

- Backend e2e: 24 suites, 191 passed / 0 failed, 25.9 s.
- Новые проверки: `page=1&limit=1` → `items/total/page/limit`;
  `limit=101` → 400; `page=0` → 400.
- Обновлены проверки списков под `body.items`.
- `backend: pnpm build` — успешно.
- `web-admin: pnpm build` — успешно; `pnpm lint` — 0 ошибок,
  4 ранее известных предупреждения.
- `mobile: flutter analyze` — No issues found.

Push-уведомления в тестах отключены (нет FCM credentials) — ожидаемо.
