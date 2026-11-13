# Результат 020 — SQL-агрегация отчётов

Дата: 2026-11-13
Статус: выполнено

## Что сделано

- `attendance` больше не выгружает тренировки в память: итоги и
  уникальные клиенты считаются через `workout.groupBy`, динамика —
  SQL `GROUP BY` с `date_trunc` по day/week/month.
- `equipmentUsage` считает итоги, типы, оборудование, клиентов и
  динамику SQL-запросами с join `WorkoutItem → Workout → GymEquipment`;
  доля считается в JS по готовым агрегатам.
- `trainersReport` использует `groupBy` по тренеру и клиенту вместо
  загрузки всех тренировок.
- Для `attendance`, `equipment-usage` и `trainers` обязательны `from`
  и `to`; проверка периода выполняется после проверки прав, поэтому
  чужой зал по-прежнему получает 403. Без периода — 400.
- Даты трактуются в UTC: `from` с 00:00:00.000, `to` до 23:59:59.999.
- `exercise-progress`, `exercises-summary`, `weight-dynamics` не
  менялись: они работают в разрезе одного клиента.

## Изменённые файлы

- `backend/src/reports/reports.service.ts`
- `backend/src/reports/attendance.e2e-spec.ts`
- `backend/src/reports/equipment-usage.e2e-spec.ts`
- `backend/src/reports/trainers.e2e-spec.ts`

## Тесты и документация

- `docs/020_tests_reports-sql.md` — отчёты 32/32, полный e2e 194/194,
  сборка успешна.
- `docs/readme.md` — раздел 020.
- `docs/020_plan_reports-sql.md` — все шаги отмечены.

## Отклонения от плана

- Web-admin не менялся: страницы отчётов уже всегда передают `from`/`to`.
- Обязательный период введён и для ADMIN, и для RECEPTION/ТРЕНЕРА;
  это соответствует решению «тяжёлые отчёты — только за период».
- Пагинация отчётов не добавлялась: агрегированный ответ ограничен
  числом клиентов/тренеров/оборудования, а не числом тренировок.