# Task 12 — релизная сборка мобильного приложения

Дата: 2026-11-12
Запрос (исходная формулировка): «Собери релиз мобильного приложения».

Сжатая формулировка: собрать релизные артефакты Flutter-приложения `mobile/`
(APK и AAB) с версией `1.0.1+2` и текущей debug-подписью.

Согласованные параметры:

- артефакты: `flutter build apk --release` и `flutter build appbundle --release`;
- подпись: debug-ключами (как настроено сейчас в
  `mobile/android/app/build.gradle.kts`), release keystore не настраивается;
- версия: `versionName = 1.0.1`, `versionCode = 2` в `mobile/pubspec.yaml`.

Ограничения:

- backend, web-admin и схема данных не меняются;
- версия меняется только в `mobile/pubspec.yaml`.
