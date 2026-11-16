# 039 — План: переименование Reception → Administrator

Дата: 2026-11-16

## Цель

Заменить название домена Reception на Administrator во всём коде, API,
схеме БД и интерфейсах, не затронув системную роль ADMIN, с сохранением
существующих данных.

## Шаги

1. БД и Prisma
   - [x] Роль `Role.RECEPTION` → `Role.ADMINISTRATOR`.
   - [x] Модель `Reception` → `Administrator`, таблица и ограничения.
   - [x] Миграция с сохранением данных (`ALTER TYPE ... RENAME VALUE`,
         `ALTER TABLE ... RENAME TO`, переименование индексов/ключей).
   - [x] Seed: env `RECEPTION_*` → `ADMINISTRATOR_*`, название по умолчанию.
2. Backend
   - [x] `src/reception` → `src/administrator`, классы/DTO/сервисы/контроллер.
   - [x] `src/receptions` → `src/administrators`, CRUD администраторов.
   - [x] API `/reception` → `/administrator`, `/admin/receptions` →
         `/admin/administrators`.
   - [x] Все `Role.RECEPTION`, `prisma.reception`, тексты ошибок.
   - [x] Затронутые модули: workouts, reports, chats, notifications,
         weight-measurements, app.module.
3. Web-admin
   - [x] Роль `RECEPTION` → `ADMINISTRATOR`.
   - [x] Маршруты `/protected/reception/*` → `/protected/administrator/*`.
   - [x] Страницы `Receptions`/`reception` → `Administrators`/`administrator`.
   - [x] API-пути и подписи «Ресепшен» → «Администратор».
4. Mobile
   - [x] Лейбл роли, тексты чата и шаблонов.
   - [x] «Написать ресепшену» → «Написать администратору».
5. Тесты
   - [x] Обновить все e2e и мобильные тесты под новые имена/API.
   - [x] Добавить проверку `/administrator/*`, `/admin/administrators` и
         роли ADMINISTRATOR.
   - [x] Backend e2e, `flutter analyze`, `flutter test`,
         web-admin lint/build.
6. Документация и доставка
   - [x] `docs/er.md`, `docs/api.md`, `docs/readme.md`.
   - [x] `docs/039_tests_*`, `docs/039_result_*`.
   - [x] Миграция на сервере, пересборка backend/web-admin, mobile 1.0.10 (12).

## Критерии готовности

- В коде, API, БД и UI нет домена Reception; роль называется ADMINISTRATOR.
- Существующие администраторы залов входят и работают со своими залами.
- ADMIN по-прежнему управляет администраторами через `/admin/administrators`.
- Все тесты и сборки зелёные, документация обновлена.
