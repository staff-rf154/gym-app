# Result 13 — тренер не может создать тренировку

Дата: 2026-11-12
Источник: `docs/013_plan_trainer-workout-create.md`
Тесты: `docs/013_tests_trainer-workout-create.md`
Статус: выполнено.

## Причина

После изменения логики целей backend `GET /api/v1/trainer/clients` отдаёт
`goal` объектом `{ id, name, description }` (или `null`) и отдельно
`goalText`. Мобильный `TrainerClient.fromJson` кастовал
`json['goal'] as String?`, поэтому при заполненной цели-справочнике список
клиентов тренера падал с `TypeError`. Без списка клиентов тренер не мог
открыть карточку и назначить тренировку.

## Что сделано

- `TrainerClient.fromJson` теперь поддерживает оба формата цели:
  объект (берётся `goal.name`), строку (старый формат) и `goalText`
  как fallback.
- Добавлены unit-тесты парсинга `TrainerClient` для нового и старого форматов.
- Версия `mobile/pubspec.yaml` поднята с `1.0.1+2` до `1.0.2+3`.
- Пересобраны релизные артефакты с debug-подписью.

## Проверенные контракты mobile ↔ backend

- `GET /trainer/clients` — поля `goal`/`goalText`, `active_trainers`,
  `assignedBy` (исправлено).
- `GET /trainer/gyms` — `gymId`, `gymName`, `gymAddress`.
- `GET /exercises`, `GET /gyms/:gymId/equipment`.
- `GET/POST/PUT /trainer/workouts` — `client_id`, `gym_id`, `date`,
  `template_id`, `comment`, `items`.
- `PUT /trainer/workout-items/:id/result`.
- `GET /trainer/templates`, `POST/PUT/DELETE /trainer/templates`.
- `GET /client/workouts`, `GET /client/gyms`, `GET /client/trainers`.
- `GET /trainer/nutrition`, `GET /client/nutrition`, `/chats`,
  `/notifications`, `/auth/*`.

Несовпадений, кроме `goal`, не найдено.

## Артефакты

- `mobile/build/app/outputs/flutter-apk/app-release.apk` — 57.3MB
  (54.7M на диске), SHA-256
  `bcc238b8d875ad63e26731f2fb04541cff7d06f0d480fe5c00b8d05c78c0bbd5`;
- `mobile/build/app/outputs/bundle/release/app-release.aab` — 55.6MB
  (53.0M на диске), SHA-256
  `a973db49ee0f50d693c184c1cdf85f3546cce302ae95e41465d01bd47d8fac24`.

`aapt dump badging`: package `com.gymapp.gym_trainer`, `versionName=1.0.2`,
`versionCode=3`, minSdk 24, targetSdk 36.

## Изменённые файлы

- `mobile/lib/features/clients/trainer_client.dart` — парсинг цели.
- `mobile/test/widget_test.dart` — тесты парсинга.
- `mobile/pubspec.yaml` — версия `1.0.2+3`.
- `docs/readme.md` — запись об изменении.

## Отклонения от плана

Нет.

## Замечания

- Release keystore не настроен, сборка подписана debug-ключами; для Google
  Play потребуется release-ключ.
