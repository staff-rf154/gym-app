# Тесты 022 — интеграция Redis

## Команды

Сборка:

```
cd backend && pnpm build
```

E2E (хост, БД `gym` на `127.0.0.1:5432`, Redis на `127.0.0.1:6379`):

```
DATABASE_URL=... JWT_SECRET=... JWT_REFRESH_SECRET=... \
DEFAULT_CLIENT_PASSWORD=... ADMIN_PHONE=... ADMIN_PASSWORD=... \
DEFAULT_TIMEZONE=Asia/Novosibirsk REDIS_HOST=127.0.0.1 REDIS_PORT=6379 \
REDIS_PASSWORD=... pnpm test:e2e
```

## Результат

- Сборка: успешно.
- E2E: **26 suites passed, 201 tests passed, 0 failed, 0 skipped**.
- Время: ~27 с.
- Нефатальное предупреждение: `PushService` — FCM credentials не заданы,
  push отключён.

## Новый набор

`backend/src/redis/redis.e2e-spec.ts` — 3 теста:

1. throttler пишет счётчики в Redis (`throttle:*`);
2. справочник залов кешируется, кеш сбрасывается после создания зала;
3. отчёт кешируется и кеш отчётов сбрасывается после создания тренера.

## Замечание

Первый полный прогон выявил 401 у тренеров без профиля `Trainer`
(4 suite, 5 тестов). Причина и исправление — `docs/bug1.md`.
После исправления полный прогон зелёный.
