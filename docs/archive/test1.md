# Test 1 — описание тестов

Дата: 2026-11-11

## Backend e2e

Запуск: `cd backend && pnpm test:e2e` (последовательно, наборы делят одну БД).

| Файл | Что проверяет |
|---|---|
| `backend/src/auth/auth.e2e-spec.ts` | login (ok / неверный пароль / несуществующий phone), `GET /auth/me` без и с токеном, refresh rotation, `PATCH /auth/timezone` (валидная/невалидная зона) |
| `backend/src/gyms/gyms.e2e-spec.ts` | CRUD залов, 401 без токена, 403 тренеру, 409 при удалении зала с оборудованием, 404 |
| `backend/src/equipment/equipment.e2e-spec.ts` | CRUD оборудования, `minWeight > maxWeight` → 400, невалидный enum → 400, GET тренером, upload без файла / `.exe` → 400 |
| `backend/src/exercises/exercises.e2e-spec.ts` | CRUD, фильтры `type` / `q`, создание клиентом → 403 |
| `backend/src/food-products/food-products.e2e-spec.ts` | CRUD, отрицательный kcal → 400 |
| `backend/src/clients/client-trainers.e2e-spec.ts` | создание клиента и `initial_password`, логин этим паролем, дубль phone → 409, назначение/деактивация тренера, дубль связи → 409 |
| `backend/src/weight-measurements/weight-measurements.e2e-spec.ts` | замеры веса, проверка активной связи (404/403), `measuredBy` из JWT |
| `backend/src/reports/reports.e2e-spec.ts` | weight-dynamics, exercise-progress (fallback план→факт), exercises-summary, resolveClientId |
| `backend/src/trainer-clients/trainer-clients.e2e-spec.ts` | `GET /trainer/clients`, фильтр `gym_id`, изоляция тренера |
| `backend/src/workouts/workouts.e2e-spec.ts` | создание/обновление тренировок, проверка связи тренер-клиент-зал |
| `backend/src/workouts/templates.e2e-spec.ts` | CRUD шаблонов и упражнений шаблона |
| `backend/src/workouts/workout-results.e2e-spec.ts` | `PUT /client/workout-items/:id/result` upsert, чужой item → 403, `done` без веса |
| `backend/src/nutrition/nutrition.e2e-spec.ts` | питание: создание со связью 201, без связи 403, фильтр `validFrom/validTo`, чужая рекомендация не видна |
| `backend/src/notifications/notifications.e2e-spec.ts` | broadcast по `gym_id` / всем, `GET /notifications` только свои, `read` идемпотентен |
| `backend/src/notifications/notifications-fcm.e2e-spec.ts` | FCM: регистрация/очистка push-токенов |
| `backend/src/chats/chat-ws.e2e-spec.ts` | `GET /chats`, сообщения, WebSocket `/chat` (`join`/`leave`/`send`, событие `chat:message`) |

Итог последнего полного прогона: 16 наборов, 118 тестов — все проходят (см. `docs/bug1.md`).

## Mobile

Запуск: `cd mobile && flutter test`.

- `mobile/test/widget_test.dart` — базовые unit/widget-тесты.
- `mobile/test/ui_smoke_test.dart` — UI-smoke M8–M14: календарь, отметка `done` с фактическим весом, питание, графики, чат, уведомления, смена TZ.

Итог: `flutter analyze` без замечаний, `flutter test` 12/12, `flutter build apk --debug` — OK.

## Web-admin

- `cd web-admin && pnpm lint && pnpm build` — без ошибок.
- UI-smoke вручную (браузера на сервере нет): логин, CRUD разделов, назначение тренера, замеры, уведомления, чаты.
