# 023 — Тесты: глобальные шаблоны и дефолтная конфигурация

Дата: 2026-11-13.

## Команды и результаты

### Backend e2e

```bash
docker compose exec -T backend pnpm test:e2e -- global-templates templates exercises
```

Результат: 3 сьюта, 27 тестов passed, 0 failed, 0 skipped, время 13.78 s.
В их числе новый `backend/src/workouts/global-templates.e2e-spec.ts`:

- ADMIN создаёт глобальный шаблон (`scope=GLOBAL`, `gymId=null`).
- ADMIN создаёт шаблон зала (`scope=GYM`).
- RECEPTION создаёт шаблон только своего зала и не видит глобальные
  в своём списке.
- TRAINER видит глобальный, шаблон зала и шаблон ресепшена.
- TRAINER не может изменить/удалить общий шаблон → 404.
- RECEPTION не может изменить глобальный шаблон → 404.
- ADMIN архивирует шаблон; запись остаётся в БД с `isActive=false`,
  `archivedAt` заполнен.
- `ensureDefaultConfiguration` идемпотентна: второй вызов возвращает
  `{ exercises: 0, equipment: 0, templates: 0 }`; шаблоны «Вес вверх»,
  «Вес вниз», «Тонус» присутствуют.
- Архивирование упражнения: `DELETE` → 204, упражнение исчезает из
  `/exercises`, запись остаётся с `isActive=false`.

```bash
docker compose exec -T backend pnpm test:e2e -- demo
```

Результат: 1 сьют, 7 тестов passed, 0 failed, время 7.76 s. Счётчики
демо-данных не изменились (3 зала, 6 тренеров, 20 клиентов, 24 демо-
упражнения, 12 демо-шаблонов, 780 тренировок, 260 замеров, 40 рекомендаций).

### Сборка и статический анализ

```bash
cd backend && pnpm build      # успешно
cd web-admin && pnpm build    # успешно (tsc -b + vite build)
cd web-admin && ./node_modules/.bin/oxlint .  # только ранее существовавшие warning
cd mobile && flutter analyze lib/features/templates lib/features/workouts
```

Flutter analyze: `No issues found!`.

### Проверка БД после миграции и seed

```sql
select (select count(*) from "WorkoutTemplate" where "defaultKey" is not null),
       (select count(*) from "Exercise" where "isActive"),
       (select count(*) from "GymEquipment" where description like '[default]%'),
       (select count(*) from "WorkoutTemplate" where name like 'Демо:%');
```

Результат: 3 дефолтных шаблона, 34 активных упражнения,
47 дефолтных тренажёров, 12 демо-шаблонов. Демо-данные перезагружены
через `POST /admin/demo/load`.

## Ошибки

- Ошибок, связанных с задачей, нет.
- `PushService` пишет ожидаемую ошибку об отсутствии FCM-credentials.
