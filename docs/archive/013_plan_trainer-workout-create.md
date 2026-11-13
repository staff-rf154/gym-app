# Plan 13 — тренер не может создать тренировку

Дата создания: 2026-11-12
Источник: `docs/013_task_trainer-workout-create.md`

## Цель

Устранить причину, по которой тренер не может создать тренировку, проверить
контракты мобильного приложения с backend и собрать новую версию mobile.

## Диагностика (до правок)

- Backend `TrainerClientsService.toResponse` после доработки целей отдаёт
  `goal` как объект `{ id, name, description }` (или `null`) и отдельно
  `goalText`.
- Mobile `TrainerClient.fromJson` (`mobile/lib/features/clients/trainer_client.dart:36`)
  кастует `json['goal'] as String?`. Если у клиента заполнена цель-справочник,
  каст падает с `TypeError`, список `/trainer/clients` не загружается,
  карточка клиента и кнопка создания тренировки недоступны.
- Остальные контракты создания тренировки совпадают:
  mobile отправляет `client_id`, `gym_id`, `date`, `template_id`, `comment`,
  `items` (camelCase), backend `CreateWorkoutDto`/`WorkoutTemplateItemDto`
  принимает именно эти поля.
- Права backend: `assertActiveLink` требует активные `ClientTrainer` и
  `TrainerGym` для выбранного зала.

## Шаги

- [x] Исправить `TrainerClient.fromJson`: поддержать `goal` объектом (новая
      логика) и строкой (старый формат), использовать `goalText` как fallback.
- [x] Добавить unit-тесты парсинга клиента тренера.
- [x] Выполнить `flutter analyze`.
- [x] Выполнить `flutter test`.
- [x] Поднять версию `mobile/pubspec.yaml` до `1.0.2+3`.
- [x] Собрать `flutter build apk --release` и `flutter build appbundle --release`.
- [x] Обновить `docs/readme.md`, `docs/013_tests_*.md`, `docs/013_result_*.md`.

## Критерии готовности

- Список клиентов тренера парсится при цели-объекте и при строковой цели.
- `flutter analyze` без ошибок, `flutter test` зелёный.
- APK/AAB собраны, `versionName 1.0.2`, `versionCode 3`.
