# 023 — Результат: глобальные шаблоны и дефолтная конфигурация

Дата: 2026-11-13. Статус: **выполнено**.

## Что сделано

### Данные и миграция

- `WorkoutTemplate`: `trainerId` стал nullable, добавлены `gymId`,
  `createdById`, `defaultKey` (unique), `isActive`, `archivedAt`.
- `Exercise`: добавлены `isActive`, `archivedAt`.
- Новые индексы: `Exercise(isActive)`, `WorkoutTemplate(gymId,isActive)`,
  `WorkoutTemplate(isActive)`.
- Миграция: `backend/prisma/migrations/20261113120000_global_workout_templates/migration.sql`.
- Существующие личные шаблоны сохранены; FK тренера теперь `ON DELETE SET NULL`.

### Дефолтная конфигурация

- `backend/src/default-config/default-config.ts`:
  - идемпотентная `ensureDefaultConfiguration(prisma, createdById?)`;
  - 34 дефолтных упражнения;
  - 22 популярных тренажёра, добавляются в каждый зал без дублей по имени;
  - глобальные шаблоны «Вес вверх» (`weight-up`), «Вес вниз`
    (`weight-down`), «Тонус» (`tone`).
- `backend/prisma/seed.ts` вызывает дефолтную конфигурацию и больше не
  прерывается при отсутствии env ресепшена.

### API

- `GET/POST /admin/templates`, `PUT/DELETE /admin/templates/:id` (ADMIN):
  глобальные шаблоны (`gym_id: null`) и шаблоны зала.
- `GET/POST /reception/templates`, `PUT/DELETE /reception/templates/:id`
  (RECEPTION): только шаблоны своего зала.
- `GET/POST/PUT/DELETE /trainer/templates`: тренер видит глобальные,
  шаблоны своих активных залов и личные; изменяет/архивирует только личные.
- Ответ шаблона дополнен `scope` (`GLOBAL`/`GYM`/`PERSONAL`), `gymId`,
  `gymName`, `createdById`, `isActive`, `archivedAt`.
- Создание/обновление тренировки разрешает применить любой доступный
  тренеру шаблон, включая общий.
- Удаление шаблона и упражнения — мягкое (`isActive=false`,
  `archivedAt=now()`). Упражнение исчезает из справочника и не может быть
  использовано в новых шаблонах, но остаётся в истории.

### Демо-данные

- `DemoService.load()` вызывает `ensureDefaultConfiguration` после создания
  демо-упражнений и тренажёров, поэтому дефолтные шаблоны ссылаются на
  существующие упражнения.
- `DemoLoadResult` дополнен `defaultEquipment`, `defaultExercises`,
  `defaultTemplates`; старые счётчики не изменены.
- `DemoService.clear()` не удаляет дефолтную конфигурацию.
- Демо-база перезагружена: 3 дефолтных шаблона, 34 активных упражнения,
  47 дефолтных тренажёров, 12 демо-шаблонов.

### Web-admin

- Новая страница `web-admin/src/pages/Templates/index.tsx`:
  создание/редактирование/архивирование, выбор области для ADMIN,
  упражнения с подходами/повторами/весом.
- Роуты `templates` (ADMIN) и `reception/templates` (RECEPTION), пункты
  меню «Шаблоны».
- Settings показывает число дефолтных шаблонов после загрузки демо.

### Mobile

- `WorkoutTemplate` получил `scope`, `gymName`, `isPersonal`, `scopeLabel`.
- Список шаблонов показывает область; общие шаблоны открываются
  информационным диалогом и не удаляются. Личные — как раньше.
- Общие шаблоны доступны в конструкторе тренировки (применение items).

## Изменённые файлы

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261113120000_global_workout_templates/migration.sql`
- `backend/prisma/seed.ts`
- `backend/src/default-config/default-config.ts`
- `backend/src/workouts/workouts.service.ts`
- `backend/src/workouts/workouts.controller.ts`
- `backend/src/workouts/workouts.module.ts`
- `backend/src/workouts/dto/create-admin-workout-template.dto.ts`
- `backend/src/workouts/dto/update-admin-workout-template.dto.ts`
- `backend/src/exercises/exercises.service.ts`
- `backend/src/demo/demo.service.ts`
- `backend/src/workouts/templates.e2e-spec.ts`
- `backend/src/workouts/global-templates.e2e-spec.ts`
- `web-admin/src/pages/Templates/index.tsx`
- `web-admin/src/router.tsx`
- `web-admin/src/layouts/MainLayout.tsx`
- `web-admin/src/pages/Settings/index.tsx`
- `mobile/lib/features/workouts/workout_models.dart`
- `mobile/lib/features/templates/templates_screen.dart`
- `docs/023_*`, `docs/verdikt3.md`, `docs/readme.md`

## Отклонения от плана

- RECEPTION видит только шаблоны своего зала, глобальные ему в списке не
  показываются (по согласованному решению).
- Популярные тренажёры добавляются только в залы, существующие на момент
  запуска seed/загрузки демо; новые залы при создании не наполняются
  автоматически (повторный seed наполнит).
- Дефолтные упражнения, совпавшие по имени с демо-упражнениями, не
  дублируются: дефолтные шаблоны ссылаются на существующие записи.

## Тесты

См. `docs/023_tests_global-workout-templates.md`: 3 e2e-сьюта / 27 тестов
passed, demo 7/7 passed, сборки backend/web-admin успешны,
`flutter analyze` без замечаний.

## Функционал

Изменения описаны в `docs/readme.md`, раздел «023».
