# 039 — Задание: переименование Reception → Administrator

Дата: 2026-11-16

## Исходная формулировка

> давай рецепшен переменуем в админстратор зада пройди во вссему коду измени везде

## Сжатая формулировка

Полностью переименовать домен Reception в Administrator:

- роль `RECEPTION` → `ADMINISTRATOR`;
- таблица/модель `Reception` → `Administrator`;
- backend-модули `reception`/`receptions` → `administrator`/`administrators`;
- API `/reception` → `/administrator`, `/admin/receptions` → `/admin/administrators`;
- web-admin: маршруты `/protected/reception` → `/protected/administrator`,
  страницы, меню, подписи «Ресепшен» → «Администратор»;
- mobile: подписи «ресепшен» → «администратор», «Написать ресепшену» →
  «Написать администратору»;
- тесты, seed, документация (`docs/er.md`, `docs/api.md`, `docs/readme.md`).

Системная роль `ADMIN` остаётся без изменений. Данные существующих
ресепшенов должны сохраниться при миграции.
