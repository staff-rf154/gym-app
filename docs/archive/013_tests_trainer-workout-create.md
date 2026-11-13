# Tests 13 — тренер не может создать тренировку

Дата: 2026-11-12
Источник: `docs/013_plan_trainer-workout-create.md`
Каталог: `mobile/`
Flutter 3.47.9 (stable), Dart SDK 3.13.7.

## Команды и результаты

| Команда | Результат | Примечание |
| --- | --- | --- |
| `flutter pub get` | passed | зависимости получены |
| `flutter analyze` | passed | No issues found! (3.5s) |
| `flutter test` | passed | 16 passed, 0 failed, ~3s |
| `flutter build apk --release` | passed | 77.8s, APK 57.3MB |
| `flutter build appbundle --release` | passed | 8.8s, AAB 55.6MB |

## Новые тесты

`mobile/test/widget_test.dart`, группа `TrainerClient.fromJson`:

- `parses goal object from trainer clients endpoint` — ответ
  `/trainer/clients` с `goal: {id, name, description}` и `active_trainers`
  парсится без ошибок, цель берётся из `goal.name`.
- `falls back to goalText when goal object is null` — при `goal: null`
  используется `goalText`.
- `keeps legacy string goal` — старый формат `goal: "Сила"` поддерживается.

Существующие тесты `mobile/test/ui_smoke_test.dart` (M8–M16) также пройдены:
календарь, отметка done, блокировка полей, завершённая тренировка, питание,
графики, чат, уведомления, часовой пояс.

## Проверка артефактов

`aapt dump badging` для APK:

```
package: name='com.gymapp.gym_trainer' versionCode='3' versionName='1.0.2'
sdkVersion:'24' targetSdkVersion:'36'
```

Размеры и SHA-256:

- APK: 54.7M,
  `bcc238b8d875ad63e26731f2fb04541cff7d06f0d480fe5c00b8d05c78c0bbd5`;
- AAB: 53.0M,
  `a973db49ee0f50d693c184c1cdf85f3546cce302ae95e41465d01bd47d8fac24`.

## Предупреждения (не блокируют сборку)

- Flutter запущен от root.
- `firebase_core` применяет Kotlin Gradle Plugin (KGP); будущие версии
  Flutter потребуют Built-in Kotlin.

## Ошибки

Нет.
