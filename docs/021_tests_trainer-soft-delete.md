# Тесты 021 — мягкое удаление тренеров

Дата: 2026-11-13

## Команда

```bash
cd backend
set -a; . ../.env; set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@127.0.0.1:5432/gym"
pnpm test:e2e -- trainers.e2e-spec
pnpm build
```

## Результаты

| Запуск | Итог |
| --- | --- |
| `-- trainers.e2e-spec` (3 suites) | 28 passed, 0 failed, 6.928 s |
| `pnpm build` backend | успешно |
| `pnpm build` web-admin | успешно, 1 563.99 kB (предупреждение о размере чанка) |

Новый набор `src/trainers/trainers.e2e-spec.ts` содержит 4 теста:
архивирование с сохранением истории, скрытие/показ архива, запрет
входа и refresh, запрет доступа клиенту.

## Примечания

- Миграция `20261113100000_trainer_archive` применена к локальной БД.
- FCM-предупреждение ожидаемое.
