# 036 — План: пересборка мобильного приложения

## Цель

Получить свежие release-артефакты mobile после изменений задания 035.

## Шаги

1. [x] `flutter clean` и `flutter pub get`.
2. [x] `flutter analyze` и `flutter test`.
3. [x] `flutter build apk --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000`.
4. [x] `flutter build appbundle --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000`.
5. [x] Проверить версию, адрес API, подпись APK/AAB и SHA-256.
6. [x] Зафиксировать `036_tests_*` и `036_result_*`.

## Критерии готовности

- APK и AAB собраны release-ключом.
- Версия `1.0.8+9`, в сборке только `https://demogym.staff-rf.ru:3000`.
- Артефакты и проверки зафиксированы в docs.
