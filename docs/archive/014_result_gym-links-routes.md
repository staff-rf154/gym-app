# Result 14 — залы не отображаются при создании тренировки

Дата: 2026-11-12
Источник: `docs/014_plan_gym-links-routes.md`
Тесты: `docs/014_tests_gym-links-routes.md`
Статус: выполнено.

## Причина

`GymLinksModule` (`backend/src/gym-links/gym-links.module.ts`) не был
импортирован в `backend/src/app.module.ts`. Из-за этого NestJS не
регистрировал маршруты привязки залов, в том числе `GET /trainer/gyms`,
который вызывает мобильный `gymsProvider`
(`mobile/lib/features/workouts/workouts_api.dart:11`). Backend отвечал 404,
поэтому выпадающий список залов при создании тренировки оставался пустым.

## Что сделано

- В `backend/src/app.module.ts` добавлен импорт и регистрация
  `GymLinksModule`.
- Добавлен e2e-тест `backend/src/gym-links/gym-links.e2e-spec.ts`:
  проверяет залы тренера, залы клиента, тренеров зала и создание
  тренировки с выбранным залом.
- Backend пересобран и перезапущен (`docker compose build backend`,
  `docker compose up -d backend`).
- Обновлён `docs/readme.md`.

## Проверка маршрутов

Проверены все маршруты из `mobile/lib` на живом backend. До исправления
404 отдавали:

- `GET /trainer/gyms`;
- `GET /client/gyms`;
- `GET /client/trainers`;
- `GET /client/gyms/:gymId/trainers`;
- `POST /client/gyms/:gymId/trainers/:trainerId/link`;
- `DELETE /client/trainers/:linkId`.

Эти же маршруты используются в `web-admin/src/components/GymsDrawer.tsx`
для административной привязки залов, поэтому web-admin также восстановлен.

Остальные маршруты мобильного приложения (авторизация, чаты, упражнения,
клиенты, тренировки, шаблоны, результаты, отчёты, питание, замеры,
уведомления) зарегистрированы и до исправления.

## Изменённые файлы

- `backend/src/app.module.ts` — подключение `GymLinksModule`.
- `backend/src/gym-links/gym-links.e2e-spec.ts` — новый e2e-тест.
- `docs/014_task_gym-links-routes.md`,
  `docs/014_plan_gym-links-routes.md`,
  `docs/014_tests_gym-links-routes.md`,
  `docs/014_result_gym-links-routes.md`.
- `docs/readme.md` — запись об изменении функционала.

## Отклонения от плана

Нет.

## Замечания

- Мобильный код не менялся: контракт `GET /trainer/gyms` уже ожидал поля
  `gymId`, `gymName`, `gymAddress`, которые возвращает backend.
- Создание тренировки требует активной связки тренер–клиент–зал; в текущей
  БД такие связки есть (21 активная).
