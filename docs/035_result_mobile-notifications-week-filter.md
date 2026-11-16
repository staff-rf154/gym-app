# 035 — Результат: уведомления при запуске и «Текущая неделя»

Дата: 2026-11-15
Статус: выполнено

## Что сделано

- Prisma: `NotificationType` (`SYSTEM/WORKOUT/MESSAGE/CHAT/NUTRITION`),
  поля `Notification.type/entityId`, индекс `(type, createdAt)`, миграция
  `20261115133608_notifications_inbox_types`.
- Backend: `NotificationsService.createEvent` сохраняет событие в inbox
  и отправляет push с `data {type, entityId}`; GET/read доступны всем
  аутентифицированным ролям; ответ содержит `type/entityId`.
- События сохраняются при тренировках (`workouts.service.ts`), сообщениях
  (`chats.service.ts`) и питании (`nutrition.service.ts`).
- Mobile: модель/API уведомлений с `type/entityId`, фильтры по типу, переход
  в нужный раздел; при запуске — баннер «У вас N новых уведомлений»
  и счётчик в колокольчике (клиент и тренер).
- Mobile: период `thisWeek` («Текущая неделя», Пн–Вс по TZ пользователя)
  по умолчанию в списках тренировок клиента и тренера; расчёт `now`
  выполняется в TZ из профиля.
- PDF-отчёт: `period` по умолчанию `week` (backend и Swagger DTO).
- Web-admin: отчёты «Посещаемость», «Загрузка тренажёров», «Тренеры»
  стартуют с текущей недели (`currentWeekRange`).
- Документация: `docs/TZ.md`, `docs/er.md`, `docs/api.md`.

## Изменённые файлы

Backend:
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261115133608_notifications_inbox_types/migration.sql`
- `backend/src/notifications/{notifications.service.ts,notifications.controller.ts,notifications.e2e-spec.ts}`
- `backend/src/workouts/workouts.service.ts`
- `backend/src/chats/chats.service.ts`
- `backend/src/nutrition/nutrition.service.ts`
- `backend/src/reports/reports-pdf.service.ts`
- `backend/src/reports/dto/report-pdf-query.dto.ts`
- `backend/src/reports/reports.e2e-spec.ts`

Mobile:
- `mobile/lib/features/notifications/{startup_notifications.dart,notification_bell.dart,notification_models.dart,notification_api.dart,notification_providers.dart,notifications_screen.dart}`
- `mobile/lib/features/client/{client_workout_models.dart,client_workouts_tab.dart}`
- `mobile/lib/features/clients/client_card_screen.dart`
- `mobile/test/widget_test.dart`

Web-admin:
- `web-admin/src/utils/format.ts`
- `web-admin/src/pages/Reports/{Attendance.tsx,Equipment.tsx,Trainers.tsx}`

Документация:
- `docs/TZ.md`, `docs/er.md`, `docs/api.md`
- `docs/035_{task,plan,tests,result}_mobile-notifications-week-filter.md`

## Отклонения от плана

- `docs/readme.md` не обновлялся: удалён в задании 033, канон — `docs/TZ.md`.
- Пункты 2–7 плана были реализованы до продолжения задания; в этой сессии
  добавлены TZ-расчёт недели по профилю, PDF-дефолт `week`, тест PDF и
  финальная синхронизация документации.

## Ссылки

- Тесты: `docs/035_tests_mobile-notifications-week-filter.md`
- Функционал: `docs/TZ.md`, `docs/api.md`, `docs/er.md`
