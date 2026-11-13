# 015 — Тесты: аудит производительности и ТЗ

Дата: 2026-11-13.

## Окружение

- Node/pnpm, PostgreSQL 16 (Docker, localhost:5432), Redis 7.
- Переменные для локального запуска: `set -a; . ./.env; set +a;`
  `export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@localhost:5432/gym"`.
- Причина первого запуска без env: `AppModule` валидирует `POSTGRES_PASSWORD`,
  `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`,
  `DEFAULT_CLIENT_PASSWORD`, `DEFAULT_TIMEZONE` и требует разные JWT-секреты.

## Команды и результаты

| Проверка | Команда | Результат | Время |
|----------|---------|-----------|-------|
| Сборка backend | `pnpm --dir backend build` | успешно (`nest build`) | ~5 с |
| E2E backend | `pnpm --dir backend test:e2e` (с env) | **24 suites passed, 183 tests passed** | 23.0 с |
| Flutter analyze | `flutter analyze` (mobile) | **No issues found** | 4.0 с |
| Сборка web-admin | `pnpm --dir web-admin build` | успешно; warning: chunk 1 560 КБ (gzip 489 КБ) | ~1 с |
| Миграции | `pnpm --dir backend exec prisma migrate deploy` | применена `20261112130000_perf_indexes` | — |

## История прогонов

1. Первый `test:e2e` — 24 suites failed: не были экспортированы env-переменные.
   Исправлено запуском с `.env` и `DATABASE_URL`.
2. Второй прогон — 1 failed: `notifications` ожидал `403` для админа, а после
   расширения ролей приходил `200`. Роли `GET /notifications` и
   `POST /notifications/:id/read` возвращены к `CLIENT` (ТЗ описывает inbox
   клиента). Транзакционность создания уведомлений сохранена.
3. Финальный прогон — 183/183 passed.

## Не запускалось

- Docker-пересборка backend/web-admin: изменения проверены локальной сборкой
  и тестами, контейнеры не перезапускались.
- FCM: `FCM_CREDENTIALS_JSON` пуст, push отключён (ожидаемо).
