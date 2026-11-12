# New 9 — выполнение plan5: старт/финиш тренировки, блокировка результатов, пошаговый режим

Дата: 2026-11-12
Запрос: «@docs/plan5.md выполняем».

## Что запланировано

- Закрыть п. 1 `docs/plan5.md`: старт/финиш клиентом, блокировка результатов после
  `DONE`/`SKIPPED`, read-only UI, e2e и документация.
- Закрыть п. 2: старт/финиш тренером, запись результатов тренером, пошаговое
  выполнение у клиента и экран тренера с несколькими клиентами одновременно.

## Что сделано

### Backend

- `backend/src/workouts/workouts.controller.ts`:
  - `POST /trainer/workouts/:id/start` и `POST /trainer/workouts/:id/finish`;
  - `PUT /trainer/workout-items/:id/result`.
- `backend/src/workouts/workouts.service.ts`:
  - `trainerStartWorkout`, `trainerFinishWorkout` с проверкой владельца тренировки
    и активной связи `ClientTrainer`/`TrainerGym`;
  - `updateTrainerItemResult` с проверкой тренера и статуса;
  - общий `assertResultEditable`: `PLANNED` → 409 «Сначала начните тренировку»,
    `DONE`/`SKIPPED` → 409 «Результаты завершённой тренировки изменять нельзя»;
  - переходы статуса через `updateMany` с ожидаемым статусом и проверкой `count`
    (защита от одновременного старта/финиша тренером и клиентом);
  - общий `upsertItemResult` для клиента и тренера.
- `backend/src/workouts/workouts.module.ts`: зарегистрирован
  `TrainerWorkoutItemsController`.
- Существующий `updateWorkout` уже возвращает 409 для `DONE`/`SKIPPED`.

### Мобильное приложение

- `mobile/lib/features/client/client_workouts_api.dart` — `startWorkout`,
  `finishWorkout` (были ранее).
- `mobile/lib/features/workouts/workouts_api.dart` — `startTrainerWorkout`,
  `finishTrainerWorkout`, `saveTrainerItemResult`.
- `mobile/lib/features/client/workout_execution.dart` — общие
  `WorkoutItemControllers`, `WorkoutItemCard`, `WorkoutStepView`:
  пошаговый режим, индикатор прогресса, «Назад»/«Далее»/«Сохранить результаты»,
  на последнем шаге — «Закончить тренировку».
- `mobile/lib/features/client/workout_day_screen.dart`:
  - `PLANNED` — поля заблокированы, кнопка «Начать тренировку»;
  - `IN_PROGRESS` — пошаговый режим, сохранение при переходе между шагами;
  - `DONE`/`SKIPPED` — только чтение, без кнопок сохранения/завершения;
  - подтверждение завершения, обновление календаря.
- `mobile/lib/features/clients/trainer_workouts_screen.dart` — экран тренера:
  клиенты и их тренировки на сегодня, старт/продолжение/завершение, несколько
  тренировок `IN_PROGRESS` одновременно, переключение без потери введённых данных
  (контроллеры и шаги хранятся по `workoutId`/`itemId` в состоянии экрана).
- `mobile/lib/features/clients/clients_screen.dart` — вход на экран тренировок дня.

### Web-admin

- Проверено: форм редактирования результатов тренировок в web-admin нет;
  изменения опираются на 409 от backend.

### Тесты и документация

- Новый `backend/src/workouts/workout-lock.e2e-spec.ts` (12 тестов):
  старт клиентом, 409 до старта, сохранение после старта, блокировка после
  `finish`, повторный start/finish, чужой клиент/тренер, `SKIPPED`, гонка
  старта, две тренировки у тренера одновременно, результат тренера и 409 после
  `finish`, клиент видит тренировку, начатую тренером.
- `backend/src/workouts/workout-results.e2e-spec.ts`: тренировка переведена в
  `IN_PROGRESS`, чтобы проверять сохранение результатов.
- `mobile/test/ui_smoke_test.dart`: M9 переведён на `IN_PROGRESS`, добавлены
  M15 (до старта поля заблокированы) и M16 (завершённая тренировка read-only).
- `docs/api.md`: новые эндпоинты, коды 403/404/409, жизненный цикл и правило
  неизменяемости.
- `docs/er.md`: жизненный цикл `PLANNED → IN_PROGRESS → DONE`/`SKIPPED` и
  запрет изменения после завершения.
- `docs/plan5.md`: все пункты отмечены `[x]`.

## Проверки

- `cd backend && npx tsc --noEmit -p tsconfig.json` — успешно.
- `cd backend && pnpm test:e2e` — 19 suites, 149 тестов пройдено.
- `cd web-admin && ./node_modules/.bin/oxlint` — только существующие
  предупреждения `src/router.tsx`; `pnpm build` — успешно.
- `cd mobile && flutter analyze` — без замечаний; `flutter test` — 13 тестов
  пройдено.

## Результат

Тренировку можно начать и закончить и клиентом, и тренером. После завершения
результаты неизменяемы для всех ролей на backend. Клиент проходит задания
пошагово, тренер ведёт несколько клиентов одновременно без смешивания данных.
