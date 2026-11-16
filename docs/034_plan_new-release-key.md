# 034 — План создания нового release-ключа

## Цель

Заменить текущий release-ключ новым, созданным по `docs/RUSTORE_KEY.md`,
и пересобрать подписанные APK/AAB.

## Шаги

1. [x] Сохранить резервную копию `/opt/compose/keyAPP/app-key.keystore` — копия создана, но утрачена после операций `keytool` (см. результат 034).
2. [x] Создать новый `app-key.keystore` с alias `sign` (RSA 2048, 36500 дней).
3. [x] Создать alias `upload` в том же keystore.
4. [x] Проверить оба alias через `keytool -list`.
5. [x] Экспортировать `upload_cert.pem`.
6. [x] Обновить `mobile/android/key.properties` на alias `upload`, права 0600.
7. [x] Собрать APK и AAB с `API_URL=https://demogym.staff-rf.ru:3000`.
8. [x] Проверить подпись (`apksigner`, `keytool -printcert`), версию и адрес.
9. [x] Зафиксировать тесты и результат (`034_tests_*`, `034_result_*`).
10. [x] Отметить в `docs/RUSTORE_KEY.md` фактический путь и alias.
11. [x] Сформировать `pepk_out.zip` для alias `sign` и сверить сертификат.

## Критерии готовности

- Оба alias существуют; отпечаток upload-сертификата новый
  (`92:7B:3E:...`), DN `a.ivanov`.
- APK/AAB подписаны новым upload-ключом.
- `pepk_out.zip` создан, сертификат внутри совпадает с `sign`.
- [ ] Старый keystore сохранён в backup — не выполнено: копия утрачена после
  операций `keytool`, отклонение зафиксировано в `034_result_*`.
- Пароли не попали в git и docs.
