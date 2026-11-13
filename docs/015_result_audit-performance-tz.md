# 015 — Результат: аудит производительности и ТЗ

Статус: **выполнено частично** — P0/P1 исправлены и проверены, открытые
пункты вынесены в `docs/015_disagreements_audit.md`.

## Что сделано

- Проведён аудит backend, web-admin, mobile и инфраструктуры.
- Исправлены критические расхождения с ТЗ: auth (смена/сброс пароля, logout,
  refresh-cookie), seed, неизменяемость `startWeight`, утечка `passwordHash`,
  ограничение доступа RECEPTION, замеры веса только тренером, блокировка
  редактирования начатой тренировки, создание чата.
- Добавлены индексы БД и миграция `20261112130000_perf_indexes`.
- Усилена инфраструктура: restart/healthcheck, nginx body limit + WebSocket,
  env-пример без рабочих паролей, управляемый Swagger.
- Web-admin: logout отзывает сессию, замеры веса только для просмотра.
- Mobile: изоляция кеша отчётов, `autoDispose`, дата питания по timezone.
- Составлен файл согласования разногласий и предложений.

## Изменённые файлы

Backend:
- `backend/src/auth/auth.controller.ts`, `auth.service.ts`
- `backend/src/auth/dto/change-password.dto.ts` (new), `reset-password.dto.ts` (new)
- `backend/src/app.module.ts`, `backend/src/main.ts`
- `backend/src/chats/chats.controller.ts`, `chats.service.ts`,
  `backend/src/chats/dto/create-chat.dto.ts` (new)
- `backend/src/clients/clients.controller.ts`, `clients.service.ts`
- `backend/src/trainers/trainers.controller.ts`, `trainers.service.ts`
- `backend/src/reception/reception.controller.ts`, `reception.service.ts`
- `backend/src/receptions/receptions.controller.ts`, `receptions.service.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/weight-measurements/weight-measurements.controller.ts`,
  `weight-measurements.service.ts`
- `backend/src/workouts/workouts.service.ts`
- `backend/src/nutrition/nutrition.service.ts`
- `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`
- `backend/prisma/migrations/20261112130000_perf_indexes/` (new)

Инфраструктура и web:
- `docker-compose.yml`, `web-admin/nginx.conf`, `.env.example`
- `web-admin/src/layouts/MainLayout.tsx`
- `web-admin/src/pages/ClientWeight/index.tsx`

Mobile:
- `mobile/lib/features/client/client_reports_tab.dart`
- `mobile/lib/features/progress/reports_providers.dart`
- `mobile/lib/features/nutrition/nutrition_providers.dart`
- `mobile/lib/features/chats/chat_providers.dart`

Документация:
- `docs/015_task_audit-performance-tz.md`
- `docs/015_plan_audit-performance-tz.md`
- `docs/015_disagreements_audit.md`
- `docs/015_tests_audit-performance-tz.md`
- `docs/015_result_audit-performance-tz.md`
- `docs/readme.md` (запись 015)

## Тесты

См. `docs/015_tests_audit-performance-tz.md`: e2e 24/24 suites, 183/183 tests;
`nest build`, `flutter analyze`, `vite build` — успешно.

## Отклонения от плана

- Пункт «уведомления для тренера/админа» откатан: e2e и ТЗ закрепляют inbox
  только для клиента.
- Админский `POST` замеров веса удалён, web-admin переведён в просмотр —
  это меняет сценарий администратора, требуется подтвердить.
- Контейнеры не пересобирались: код проверен локально, миграция применена к БД.

## Открытые вопросы

Перечислены в `docs/015_disagreements_audit.md` (раздел 2): self-link клиента,
агрегация отчётов в SQL, пагинация, каскадное удаление тренера, `isActive`
залов, Redis, UI паролей, кеш mobile, тестовая БД, `pg_hba`.
