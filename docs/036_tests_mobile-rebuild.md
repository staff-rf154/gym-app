# 036 — Тесты: пересборка мобильного приложения

Дата: 2026-11-15
Среда: Flutter 3.47.9 (stable), JDK 17, Android build-tools 36.0.0.

## Команды и результаты

| № | Команда | Результат | Время |
| --- | --- | --- | --- |
| 1 | `flutter clean && flutter pub get` | зависимости восстановлены | ~8 с |
| 2 | `flutter analyze` | `No issues found!` | 0.9 с |
| 3 | `flutter test` | 25 passed, 0 failed | ~8 с |
| 4 | `flutter build apk --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000` | APK 60.6 MB | 129.3 с |
| 5 | `flutter build appbundle --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000` | AAB 57.9 MB | 11.8 с |
| 6 | `aapt2 dump badging app-release.apk` | `versionCode=9`, `versionName=1.0.8`, `minSdk=24`, `targetSdk=36` | < 1 с |
| 7 | `strings lib/arm64-v8a/libapp.so` | присутствует `https://demogym.staff-rf.ru:3000` | < 1 с |
| 8 | `apksigner verify --print-certs` | SHA-256 `92:7B:3E:...:5E:0A` (`upload`) | < 1 с |
| 9 | `keytool -printcert -jarfile app-release.aab` | тот же сертификат `92:7B:3E:...:5E:0A` | < 1 с |
| 10 | `jarsigner -verify app-release.aab` | exit 0, `jar verified` | < 1 с |

## Артефакты

| Файл | Размер | SHA-256 |
| --- | --- | --- |
| `mobile/build/app/outputs/flutter-apk/app-release.apk` | 60.6 MB | `98c02bdb7cf936e6b6f59e470e7a2f03144bc2e1bff1367e68a2bfd8ef13eff0` |
| `mobile/build/app/outputs/bundle/release/app-release.aab` | 57.9 MB | `5259024fab85729b9cfa9dfd351e933e08d56c1aa7536154f0dfba071bbcb5fc` |

## Предупреждения

- `firebase_core` применяет KGP; будущие версии Flutter потребуют Built-in Kotlin.
- Запуск Flutter от root — предупреждение окружения, сборку не блокирует.
- `jarsigner` сообщает о подписанных entry в `JarFile`, но не в `JarInputStream`; exit 0, подпись валидна.

## Итог

- passed: 25 mobile tests + analyze + APK/AAB builds + проверки подписи
- failed: 0
- skipped: 0
