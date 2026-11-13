# Tests 14 — залы не отображаются при создании тренировки

Дата: 2026-11-12
Источник: `docs/014_plan_gym-links-routes.md`

## Автотесты

Команда:

```bash
cd backend
set -a && . ../.env && set +a
export DATABASE_URL="postgresql://gym:${POSTGRES_PASSWORD}@localhost:5432/gym"
export NODE_ENV=test
npx jest --config jest.config.js --runInBand src/gym-links/gym-links.e2e-spec.ts
```

Набор `backend/src/gym-links/gym-links.e2e-spec.ts`:

- `GET /trainer/gyms возвращает залы тренера` — passed;
- `GET /client/gyms возвращает залы клиента` — passed;
- `GET /client/gyms/:gymId/trainers возвращает тренеров зала` — passed;
- `POST /trainer/workouts создаёт тренировку с выбранным залом` — passed.

Итог: passed 4, failed 0, skipped 0. Время: 3.995 s.
Единственный вывод в логе: `PushService` — FCM credentials not found, push disabled
(ожидаемо для тестового окружения).

## Проверка типов

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
```

Результат: exit 0, ошибок нет.

## Живая проверка после пересборки backend

```bash
curl -o /dev/null -w '%{http_code}' http://localhost:8080/api/v1/trainer/gyms
```

- до исправления: `404`;
- после: без токена `401` (маршрут зарегистрирован).

С токеном демо-тренера `+79995550001`:

- `GET /api/v1/trainer/gyms` → `200`, вернулся зал
  `Демо-зал «Центральный»` (`gymId b3c24e0d-06e7-4d02-b5f7-26a815aff5df`);
- `GET /api/v1/trainer/clients` → `200`, 4 клиента.

С токеном демо-клиента `+79995550101`:

- `GET /api/v1/client/gyms` → `200`;
- `GET /api/v1/client/trainers` → `200`;
- `GET /api/v1/client/gyms/:gymId/trainers` → `200`.

## Проверка маршрутов мобильного приложения

Все маршруты из `mobile/lib` проверены через живой backend. До исправления
404 отдавали только 6 маршрутов привязки залов; после исправления все
маршруты зарегистрированы (без токена отвечают `401`, с токеном — `200`).
