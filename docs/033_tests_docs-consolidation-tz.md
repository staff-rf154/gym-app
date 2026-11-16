# 033 — Тесты

Дата: 2026-11-15
Среда: Flutter 3.47.9 (stable), JDK 17, Android build-tools 36.0.0; backend-стек
в Docker запущен.

> Артефакты и подпись пересобраны в задаче 034 с новым ключом. Актуальные
> SHA-256 и отпечаток сертификата — в `docs/034_tests_new-release-key.md`.

## Выполнено

| № | Команда | Результат | Время |
| --- | --- | --- | --- |
| 1 | `cd mobile && flutter analyze` | `No issues found!` | 3.5 с |
| 2 | `cd mobile && flutter test` | 24 passed, 0 failed, 0 skipped | ~8 с |
| 3 | `git diff --check` | ошибок пробелов нет | < 1 с |
| 4 | Проверка адресов в `mobile/lib` | только `https://demogym.staff-rf.ru:3000`; старых хостов нет | < 1 с |
| 5 | `curl -sk https://127.0.0.1:3000/api/docs-json` | 200, 65 261 байт (источник `docs/api.md`) | < 1 с |
| 6 | `flutter build apk --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000` | APK 60.5 MB, release-подпись | 5.7 с |
| 7 | `flutter build appbundle --release --dart-define=API_URL=https://demogym.staff-rf.ru:3000` | AAB 57.8 MB, release-подпись | 8.3 с |
| 8 | `aapt2 dump badging app-release.apk` | `versionCode=9`, `versionName=1.0.8` | < 1 с |
| 9 | `strings lib/arm64-v8a/libapp.so` (APK и AAB) | только `https://demogym.staff-rf.ru:3000` | < 1 с |
| 10 | `apksigner verify --print-certs` (APK) | `CN=a.ivanov, O=staff-rf`; не debug | < 1 с |
| 11 | `keytool -printcert -jarfile` + `jarsigner -verify` (AAB) | `jar verified`, `CN=a.ivanov` | < 1 с |

## Артефакты

| Файл | Размер | SHA-256 |
| --- | --- | --- |
| `mobile/build/app/outputs/flutter-apk/app-release.apk` | 57.7 MiB | `4411f4dff470d0892cc45ca2cbf77693075075b90067f7acd8fadac1c4f6c770` |
| `mobile/build/app/outputs/bundle/release/app-release.aab` | 55.2 MiB | `2248408bff932a1900094e823c6e9532753ed9021bbf5b2634053c4de76639f5` |

Сертификат подписи: `CN=a.ivanov, OU=IT, O=staff-rf, L=nso, ST=nsk, C=rf`,
RSA 2048, SHA-256:
`37:61:7B:F7:F5:55:48:83:A6:AC:8B:7A:CA:79:D2:5C:6A:8F:E5:40:28:72:83:BE:E1:FB:0E:78:0D:98:5A:EF`.

Параметры подписи: `mobile/android/key.properties` (0600, в `.gitignore`),
keystore `/opt/compose/keyAPP/app-key.keystore`, alias `a.ivanov`.

## Набор mobile-тестов

- `normalizeApiBaseUrl`: добавление `https://` и `/api/v1`, сохранение схемы,
  удаление завершающих `/`, отсутствие дубля префикса, пустое значение.
- `resolveApiBaseUrl`: замена сохранённого адреса при устаревшей версии
  конфига (теперь версия 3) и сохранение при актуальной.
- `TrainerClient.fromJson`: объект цели, fallback на текст, legacy-строка.
- `matchesWorkoutPeriod`: всё время, текущий месяц, прошлый месяц, 3 месяца.
- UI-smoke M8–M18: календарь, выполнение, блокировки, read-only, листание
  завершённой тренировки, единый экран, питание, графики, чат, уведомления,
  часовой пояс.

## Не выполнено

- Backend e2e и web-admin lint/build в рамках задачи 033 не запускались:
  изменения касаются документации, адреса API и подписи. Команды для приёмки:
  `make test`, `cd web-admin && pnpm lint && pnpm build`.
- Прогон D1–D4 на физическом Android-устройстве — вне среды выполнения;
  выполняется по чек-листу `docs/TZ.md`, раздел 14.3.

## Вывод

Статический анализ и 24 mobile-теста зелёные. APK и AAB собраны, подписаны
release-ключом, содержат версию `1.0.8+9` и только новый адрес
`https://demogym.staff-rf.ru:3000`.
