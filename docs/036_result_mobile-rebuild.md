# 036 — Результат: пересборка мобильного приложения

Дата: 2026-11-15
Статус: выполнено

## Что сделано

- Выполнены `flutter clean`, `flutter pub get`, `flutter analyze`, `flutter test`.
- Собраны release APK и AAB с `API_URL=https://demogym.staff-rf.ru:3000`.
- Проверены версия, адрес API, подпись и хеши артефактов.

## Артефакты

- `mobile/build/app/outputs/flutter-apk/app-release.apk` — 60.6 MB,
  SHA-256 `98c02bdb7cf936e6b6f59e470e7a2f03144bc2e1bff1367e68a2bfd8ef13eff0`.
- `mobile/build/app/outputs/bundle/release/app-release.aab` — 57.9 MB,
  SHA-256 `5259024fab85729b9cfa9dfd351e933e08d56c1aa7536154f0dfba071bbcb5fc`.

## Проверки

- Версия: `1.0.8+9` (`versionCode=9`, `versionName=1.0.8`), не менялась.
- Подпись: `upload`, SHA-256 `92:7B:3E:90:86:80:C9:76:93:F9:97:42:9D:72:45:79:E2:BE:26:92:B4:2C:48:62:1E:34:65:F7:92:17:5E:0A`.
- В `libapp.so` присутствует `https://demogym.staff-rf.ru:3000`.

## Изменённые файлы

- `docs/036_task_mobile-rebuild.md`
- `docs/036_plan_mobile-rebuild.md`
- `docs/036_tests_mobile-rebuild.md`
- `docs/036_result_mobile-rebuild.md`

Код не изменялся; пересобраны только артефакты в `mobile/build/`.

## Отклонения от плана

Нет. Версия `1.0.8+9` сохранена: для публикации новой сборки потребуется
инкремент `versionCode` в `mobile/pubspec.yaml`.

## Ссылки

- Тесты: `docs/036_tests_mobile-rebuild.md`
- Предыдущая сборка: `docs/034_result_new-release-key.md`
