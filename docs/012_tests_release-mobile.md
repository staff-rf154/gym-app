# Tests 12 — релизная сборка мобильного приложения

Дата: 2026-11-12
Источник: `docs/012_plan_release-mobile.md`
Каталог: `mobile/`
Flutter 3.47.9 (stable), Android build-tools 36.0.0.

## Команды и результаты

| Команда | Результат | Примечание |
| --- | --- | --- |
| `flutter pub get` | passed | зависимости получены |
| `flutter analyze` | passed | No issues found! (3.2s) |
| `flutter test` | passed | 13 passed, 0 failed, ~8s |
| `flutter build apk --release` | passed | 276.8s, APK 57.3MB |
| `flutter build appbundle --release` | passed | 10.5s, AAB 55.6MB |

## Набор тестов `flutter test`

`test/widget_test.dart` (4 теста `normalizeApiBaseUrl`),
`test/ui_smoke_test.dart` (M8–M16: календарь, отметка done, блокировка полей,
только чтение завершённой тренировки, питание, графики, чат, уведомления,
часовой пояс). Все 13 пройдены.

## Проверка артефактов

`aapt dump badging` для APK:

```
package: name='com.gymapp.gym_trainer' versionCode='2' versionName='1.0.1'
sdkVersion:'24' targetSdkVersion:'36'
```

## Предупреждения (не блокируют сборку)

- Flutter запущен от root.
- `firebase_core` применяет Kotlin Gradle Plugin; будущие версии Flutter
  потребуют перехода на Built-in Kotlin.
- Deprecated API в Java-исходниках плагинов.

## Ошибки

Нет.
