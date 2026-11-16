# 034 — Тесты

Дата: 2026-11-15
Среда: Flutter 3.47.9 (stable), JDK 17, Android build-tools 36.0.0.

## Создание ключа

| № | Команда | Результат |
| --- | --- | --- |
| 1 | `keytool -genkeypair -alias sign ...` | ключ RSA 2048, срок 36500 дней |
| 2 | `keytool -genkeypair -alias upload ...` | ключ RSA 2048, срок 36500 дней |
| 3 | `keytool -delete -alias a.ivanov` | старый alias удалён; остались `sign` и `upload` |
| 4 | `keytool -exportcert -alias upload -rfc` | `upload_cert.pem` создан |
| 5 | `keytool -list` | 2 записи: `sign`, `upload` |

Отпечатки:

- `sign`: `19:CA:96:6F:50:D9:66:58:C2:81:AD:61:80:76:E2:20:0B:FF:AD:BF:CE:FB:0C:59:98:E6:72:19:94:A8:8F:A3`
- `upload`: `92:7B:3E:90:86:80:C9:76:93:F9:97:42:9D:72:45:79:E2:BE:26:92:B4:2C:48:62:1E:34:65:F7:92:17:5E:0A`

## Сборка и проверки

| № | Команда | Результат | Время |
| --- | --- | --- | --- |
| 6 | `flutter clean` + `flutter pub get` | зависимости восстановлены | — |
| 7 | `flutter analyze` | `No issues found!` | 2.4 с |
| 8 | `flutter test` | 24 passed, 0 failed | ~9 с |
| 9 | `flutter build apk --release ...` | APK 60.5 MB | 114.5 с |
| 10 | `flutter build appbundle --release ...` | AAB 57.8 MB | 16.2 с |
| 11 | `aapt2 dump badging app-release.apk` | `versionCode=9`, `versionName=1.0.8` | < 1 с |
| 12 | `strings libapp.so` (APK/AAB) | только `https://demogym.staff-rf.ru:3000` | < 1 с |
| 13 | `apksigner verify --print-certs` | SHA-256 `92:7B:3E:...:5E:0A` (upload) | < 1 с |
| 14 | `keytool -printcert -jarfile` (AAB) | тот же сертификат, serial `341ac6db365c7745` | < 1 с |
| 15 | `jarsigner -verify` (AAB) | `jar verified` | < 1 с |
| 16 | `java -jar pepk.jar --alias sign ... --include-cert` | `pepk_out.zip` создан | ~1 с |
| 17 | `unzip -t pepk_out.zip` | `zip: OK`, 2 файла | < 1 с |
| 18 | `openssl x509 -fingerprint -sha256` | `19:CA:96:...:8F:A3` (совпадает с `sign`) | < 1 с |

PEPK: первый архив с `encryptionkey` был отклонён RuStore; после получения нового ключа архив перегенерирован. `pepk_out.zip` — SHA-256
`a8bbd201d59de41fc811a6dfc749d2044b9633421dd88834f3e8be45b6a2914e`.
В команде пользователя alias `A Ivanov` и путь после `--include-cert` были
некорректны; использован alias `sign`, `--include-cert` как флаг.

## Артефакты

| Файл | Размер | SHA-256 |
| --- | --- | --- |
| `mobile/build/app/outputs/flutter-apk/app-release.apk` | 57.7 MiB | `c821633d808c308b2a51df2f961cbc1146f4e3f48fadaa6797136dbcfe0e5c4b` |
| `mobile/build/app/outputs/bundle/release/app-release.aab` | 55.2 MiB | `b15c33c2cf60515894897bbf42b3c42023f2b6b924088d81ce6b376d607e315d` |

## Отклонение

Резервная копия старого keystore `app-key.keystore.bak-20261115` была создана,
но после операций `keytool` отсутствует на диске. Старый приватный ключ
`a.ivanov` утрачен; восстановить его из репозитория невозможно (keystore не
коммитился). Новый ключ создан и проверен.

## Вывод

Приложение полностью пересобрано с новым ключом: APK и AAB подписаны
upload-сертификатом `92:7B:3E:...`, версия `1.0.8+9`, адрес только
`https://demogym.staff-rf.ru:3000`.
