# Result 12 — релизная сборка мобильного приложения

Дата: 2026-11-12
Источник: `docs/012_plan_release-mobile.md`
Тесты: `docs/012_tests_release-mobile.md`
Статус: выполнено.

## Что сделано

- Версия в `mobile/pubspec.yaml` поднята с `1.0.0+1` до `1.0.1+2`.
- Выполнены `flutter pub get`, `flutter analyze`, `flutter test` — без ошибок,
  13 тестов пройдено.
- Собраны релизные артефакты с debug-подписью:
  - `mobile/build/app/outputs/flutter-apk/app-release.apk` — 57.3MB
    (54M на диске), SHA-256
    `7b28193f9ee0a2f65383fc2691610425d8dcc1e6459426efcff66a99c6f327df`;
  - `mobile/build/app/outputs/bundle/release/app-release.aab` — 55.6MB
    (54M на диске), SHA-256
    `303415cbf62d6f5642f53693d6d1bbaf776760f0b59c3eeaeedc22bd0c800daa`.
- Проверено через `aapt dump badging`: package `com.gymapp.gym_trainer`,
  `versionName=1.0.1`, `versionCode=2`, minSdk 24, targetSdk 36.

## Изменённые файлы

- `mobile/pubspec.yaml` — версия `1.0.1+2`.

## Изменения функционала

Нет. Backend, web-admin, Android-конфигурация и схема данных не менялись;
обновлены только версия и релизные артефакты. Запись в `docs/readme.md`
добавлена.

## Отклонения от плана

Нет. Подпись оставлена debug-ключами по согласованию с пользователем.

## Замечания

- Release keystore не настроен: для публикации в Google Play потребуется
  создать ключ и заменить `signingConfig` в
  `mobile/android/app/build.gradle.kts:34-36`.
- AAB собран с debug-подписью — для Play нужен release-ключ.
