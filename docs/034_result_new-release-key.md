# 034 — Результат

Дата: 2026-11-15
Статус: выполнено с отклонением (старый ключ заменён; резервная копия старого
keystore утрачена).

## Что сделано

1. Создан новый keystore `/opt/compose/keyAPP/app-key.keystore` по
   `docs/RUSTORE_KEY.md`: alias `sign` (подпись приложения) и `upload`
   (подпись AAB), RSA 2048, срок 36500 дней.
2. Старый alias `a.ivanov` удалён из keystore; остались только `sign` и
   `upload`.
3. Экспортирован `upload_cert.pem`.
4. `mobile/android/key.properties` переключён на `keyAlias=upload`, права
   0600; файл в `.gitignore`.
5. Выполнена полная пересборка: `flutter clean`, `flutter pub get`,
   `flutter analyze`, `flutter test`, release APK и AAB.
6. Проверены подпись, версия, адрес и целостность артефактов.
7. Сформирован PEPK-ZIP для ключа `sign`; сертификат внутри сверен с
   отпечатком `sign`.

## Новый ключ

- `sign` SHA-256:
  `19:CA:96:6F:50:D9:66:58:C2:81:AD:61:80:76:E2:20:0B:FF:AD:BF:CE:FB:0C:59:98:E6:72:19:94:A8:8F:A3`
- `upload` SHA-256:
  `92:7B:3E:90:86:80:C9:76:93:F9:97:42:9D:72:45:79:E2:BE:26:92:B4:2C:48:62:1E:34:65:F7:92:17:5E:0A`
- Сертификат: `CN=a.ivanov, OU=IT, O=staff-rf, L=nso, ST=nsk, C=rf`,
  serial `341ac6db365c7745`, срок до 2126-10-22.

## Артефакты

| Файл | Размер | SHA-256 |
| --- | --- | --- |
| `mobile/build/app/outputs/flutter-apk/app-release.apk` | 57.7 MiB | `c821633d808c308b2a51df2f961cbc1146f4e3f48fadaa6797136dbcfe0e5c4b` |
| `mobile/build/app/outputs/bundle/release/app-release.aab` | 55.2 MiB | `b15c33c2cf60515894897bbf42b3c42023f2b6b924088d81ce6b376d607e315d` |
| `/opt/compose/keyAPP/pepk_out.zip` | 2.9 KiB | `a8bbd201d59de41fc811a6dfc749d2044b9633421dd88834f3e8be45b6a2914e` |

APK: `apksigner` подтверждает сертификат `92:7B:3E:...`; AAB: `jar verified`.
Версия `1.0.8+9`, в `libapp.so` только `https://demogym.staff-rf.ru:3000`.

## Изменённые файлы

- `/opt/compose/keyAPP/app-key.keystore` (заменён)
- `/opt/compose/keyAPP/upload_cert.pem` (новый)
- `mobile/android/key.properties` (не отслеживается git)
- `mobile/build/app/outputs/flutter-apk/app-release.apk`
- `mobile/build/app/outputs/bundle/release/app-release.aab`
- `/opt/compose/keyAPP/pepk_out.zip` (новый)
- `docs/RUSTORE_KEY.md`
- `docs/034_task_new-release-key.md`
- `docs/034_plan_new-release-key.md`
- `docs/034_tests_new-release-key.md`
- `docs/034_result_new-release-key.md`

## Отклонения и последствия

- Резервная копия старого keystore `app-key.keystore.bak-20261115` была
  создана, но после операций `keytool` отсутствует на диске. Старый приватный
  ключ `a.ivanov` утрачен безвозвратно: keystore никогда не коммитился, копий
  в репозитории и на диске нет.
- Старые APK/AAB удалены командой `flutter clean`; текущие артефакты подписаны
  только новым ключом.
- Если сборки со старой подписью уже были установлены или опубликованы,
  обновление потребует процедуры смены ключа в RuStore. Для нового приложения
  это не критично.
- PEPK-ZIP для загрузки ключа `sign` в RuStore не сформирован: нужен
  `encryptionkey` из RuStore Консоли. Шаги — `docs/RUSTORE_KEY.md`, раздел 3.3.

## Осталось

- PEPK-ZIP сформирован: `/opt/compose/keyAPP/pepk_out.zip` для alias `sign`,
  внутри `encryptedPrivateKey` и `certificate.pem`; отпечаток сертификата
  совпадает с `sign`. Исходная команда содержала неверный alias
  (`A Ivanov`) и путь после `--include-cert`; выполнено с `--alias sign` и
  `--include-cert` как флагом.

## Осталось

1. Загрузить `pepk_out.zip` и `upload_cert.pem` в RuStore, затем AAB.
2. Прогнать D1–D4 на физическом Android-устройстве.

## Статус

Выполнено с отклонением: новый ключ создан, приложение полностью пересобрано
и подписано; старый ключ утрачен, резервная копия не сохранилась.
