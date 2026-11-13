# Plan 12 — релизная сборка мобильного приложения

Дата создания: 2026-11-12
Источник: `docs/012_task_release-mobile.md`

## Цель

Получить релизные артефакты мобильного приложения `mobile/`: APK и AAB,
версия `1.0.1+2`, подпись debug-ключами.

## Принятые решения

- Подпись остаётся debug-ключами: release keystore и `key.properties`
  отсутствуют, настройка новых ключей в задачу не входит.
- `versionName`/`versionCode` берутся Flutter из `version` в `pubspec.yaml`,
  поэтому меняется только эта строка.
- Перед сборкой выполняется `flutter pub get`, затем `flutter analyze`
  и `flutter test`; затем обе релизные сборки.

## Шаги

- [x] Обновить `mobile/pubspec.yaml`: `version: 1.0.1+2`.
- [x] Выполнить `flutter pub get`.
- [x] Выполнить `flutter analyze`.
- [x] Выполнить `flutter test`.
- [x] Собрать APK: `flutter build apk --release`.
- [x] Собрать AAB: `flutter build appbundle --release`.
- [x] Зафиксировать артефакты и размеры.
- [x] Обновить `docs/readme.md`.
- [x] Зафиксировать тесты и результат (`docs/012_tests_*.md`,
  `docs/012_result_*.md`).

## Критерии готовности

- `flutter analyze` без ошибок.
- `flutter test` проходит.
- Собраны `mobile/build/app/outputs/flutter-apk/app-release.apk` и
  `mobile/build/app/outputs/bundle/release/app-release.aab`.
- APK/AAB имеют `versionName 1.0.1`, `versionCode 2`.
