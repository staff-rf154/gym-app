# Gym App — правила проекта

## Стек
- backend/ — NestJS + Prisma + PostgreSQL + Redis
- web-admin/ — React + Vite + Ant Design
- mobile/ — Flutter Android (пока не создаём)

## Обязательные правила
1. Всегда читай @docs/er.md перед работой с моделями
2. Всегда читай @docs/api.md перед созданием эндпоинтов
3. DateTime в Prisma → @db.Timestamptz, Workout.date → @db.Date
4. Не создавай файлы, которые не запрошены явно
5. Не запускай миграции и seed — это делает человек
6. Один модуль = один чат. Не трогай соседние модули

## Экономия токенов
- Не перечитывай файлы без необходимости
- PartialType для Update DTO
- Тесты в отдельном *.e2e-spec.ts
