# Plan 14 — залы не отображаются при создании тренировки

Дата создания: 2026-11-12
Источник: `docs/014_task_gym-links-routes.md`

## Цель

Вернуть регистрацию маршрутов привязки залов и проверить, что мобильное
приложение может получить список залов и создать тренировку клиента.

## Диагностика (до правок)

- `backend/src/gym-links/gym-links.module.ts` содержит контроллеры
  `TrainerGymsController` (`GET trainer/gyms`), `ClientGymsController`
  (`client/gyms`, `client/trainers`, привязка/отвязка тренера) и
  административные контроллеры привязки залов.
- Модуль `GymLinksModule` не импортирован в `backend/src/app.module.ts`,
  поэтому маршруты не регистрируются.
- Живая проверка backend `http://localhost:8080/api/v1`:
  - `GET /trainer/gyms` → 404;
  - `GET /client/gyms`, `GET /client/trainers`,
    `GET /client/gyms/:id/trainers`, `POST .../link`,
    `DELETE /client/trainers/:id` → 404;
  - остальные 36 маршрутов мобильного приложения отвечают 401 без токена,
    то есть зарегистрированы.
- В БД есть 6 активных `TrainerGym` и 21 активная связка
  `ClientTrainer` тренер–клиент–зал, данные корректны.
- Мобильный `gymsProvider` вызывает `GET /trainer/gyms`
  (`mobile/lib/features/workouts/workouts_api.dart:11`), поэтому 404 даёт
  пустой/ошибочный список залов.

## Шаги

- [x] Создать файлы задания и плана в `docs/`.
- [x] Импортировать `GymLinksModule` в `backend/src/app.module.ts`.
- [x] Добавить e2e-тест `backend/src/gym-links/gym-links.e2e-spec.ts`.
- [x] Пересобрать и перезапустить backend.
- [x] Проверить маршруты и создание тренировки с реальным токеном тренера.
- [x] Обновить `docs/readme.md`, `docs/014_tests_*.md`,
      `docs/014_result_*.md`.

## Критерии готовности

- `GET /api/v1/trainer/gyms` возвращает залы тренера.
- `POST /api/v1/trainer/workouts` создаёт тренировку с выбранным залом.
- Маршруты `client/gyms` и `client/trainers` доступны клиенту.
- e2e-тест проходит.
- Мобильный код не изменяется.
