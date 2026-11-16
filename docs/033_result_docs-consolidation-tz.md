# 033 — Результат

Дата: 2026-11-15
Статус: выполнено.

> Приложение пересобрано в задаче 034 с новым ключом. Актуальные артефакты,
> SHA-256 и сертификат — в `docs/034_result_new-release-key.md`.

## Что сделано

1. Создано единое ТЗ `docs/TZ.md` (версия 2.0): назначение, роли и матрица
   прав, функциональные требования web/mobile/backend, бизнес-правила,
   модель данных, каталог API, экраны, НФТ, инфраструктура и HTTPS,
   мобильное приложение, план разработки, план приёмки, тест-план и Gherkin,
   поставка, реестр дефектов bug1–4, риски, консолидированная история решений.
2. Создана инструкция `docs/RUSTORE_KEY.md`: ключи sign/upload, PEPK,
   PEM-сертификат, настройка release-подписи Flutter, сборка и проверка AAB,
   загрузка в RuStore, CSR для ОС Аврора (ГОСТ 34.10-2012), безопасность.
3. Обновлён `docs/er.md` под актуальную Prisma-схему (статусы, архивация,
   шаблоны, `startedAt`, индексы, миграции).
4. `docs/api.md` заменён полной OpenAPI-спецификацией, сгенерированной из
   работающего backend (`/api/docs-json`).
5. Удалены исторические файлы: 015–032, bug1–4, verdikt1–5, `readme.md`,
   `tehzadanie.md`, `TZ_mobile.md`, `TZ_mobile_d.md`, `archive/`. Их решения,
   ограничения и дефекты вошли в `docs/TZ.md`.
6. Обновлён корневой `README.md` под фактическое состояние: HTTPS :3000,
   актуальная версия mobile `1.0.8+9`, release-подпись, команды, тесты,
   ссылки на новые документы, ограничения.
7. Изменён адрес mobile: `mobile/lib/core/api/api_config.dart` —
   `https://demogym.staff-rf.ru:3000`, версия конфига 3 (старый сохранённый
   адрес автоматически заменяется).
8. `mobile/pubspec.yaml` — версия `1.0.8+9`.
9. `mobile/android/app/build.gradle.kts` — добавлена release-подпись через
   `mobile/android/key.properties` с безопасным fallback на debug.
10. Создан `mobile/android/key.properties` (0600, в `.gitignore`) для keystore
    `/opt/compose/keyAPP/app-key.keystore`, alias `a.ivanov`.
11. Собраны и проверены release-артефакты:
    - APK `versionCode 9`, `versionName 1.0.8`, подпись `CN=a.ivanov`;
    - AAB `jar verified`, подпись `CN=a.ivanov`;
    - в обоих артефактах в `libapp.so` только
      `https://demogym.staff-rf.ru:3000`, старых хостов нет.
    SHA-256: APK `4411f4dff470d0892cc45ca2cbf77693075075b90067f7acd8fadac1c4f6c770`,
    AAB `2248408bff932a1900094e823c6e9532753ed9021bbf5b2634053c4de76639f5`.

## Изменённые файлы

- `docs/TZ.md` (новый)
- `docs/RUSTORE_KEY.md` (новый)
- `docs/er.md` (переписан)
- `docs/api.md` (перегенерирован)
- `docs/033_task_docs-consolidation-tz.md` (новый)
- `docs/033_plan_docs-consolidation-tz.md` (новый)
- `docs/033_tests_docs-consolidation-tz.md` (новый)
- `docs/033_result_docs-consolidation-tz.md` (этот файл)
- `README.md` (переписан)
- `mobile/lib/core/api/api_config.dart`
- `mobile/pubspec.yaml`
- `mobile/android/app/build.gradle.kts`
- удалены исторические файлы `docs/` (см. п. 5)

## Ссылки

- Тесты: `docs/033_tests_docs-consolidation-tz.md`
- Изменения функционала: `docs/TZ.md`, раздел 12 и `README.md`
- Журнал изменений: заменён разделом 19 «История решений» в `docs/TZ.md`
  (отдельный `docs/readme.md` удалён по требованию задания)
- Ключи и RuStore: `docs/RUSTORE_KEY.md`

## Отклонения от плана

- Порт 3000 указан явно в адресе mobile, хотя ранее было решение использовать
  443; приоритет у текущего задания.
- `docs/api.md` не редактировался вручную, а сгенерирован из живого backend,
  чтобы исключить расхождения.
- Backend e2e и web-admin lint/build не запускались (вне изменений задачи).
- Прогон D1–D4 на физическом Android-устройстве не выполнялся: в среде
  разработки нет устройства/эмулятора. Выполняется по чек-листу
  `docs/TZ.md`, раздел 14.3.
- Для публикации в RuStore необходимо загрузить PEPK-ZIP ключа подписи и
  PEM-сертификат upload-ключа по `docs/RUSTORE_KEY.md` (текущий ключ
  использован и для подписи, и для загрузки).

## Статус

Выполнено. Документация консолидирована, README обновлён, адрес и версия
изменены, APK/AAB собраны и подписаны release-ключом. Остаточные пункты:
ручной прогон на устройстве и загрузка подписи в RuStore.
