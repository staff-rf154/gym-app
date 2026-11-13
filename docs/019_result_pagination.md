# Результат 019 — пагинация списков

**Статус:** выполнено.

## Что сделано

- Добавлен общий `PaginationQueryDto` (`page`, `limit`, `skip`) и тип
  `PaginatedResponse<T>`; `limit` по умолчанию 20, максимум 100.
- Пагинация включена для:
  - `GET /admin/clients`, `GET /admin/trainers`;
  - `GET /reception/clients`, `GET /reception/trainers`;
  - `GET /trainer/workouts`, `GET /client/workouts`;
  - `GET /chats`;
  - `GET /notifications`.
- Фильтры (зал, клиент, период) комбинируются с `page`/`limit`.
- Web-admin читает `items` и запрашивает `limit=100` для таблиц
  и справочников отчётов.
- Mobile читает `items` для чатов, уведомлений и тренировок,
  запрашивает `limit=100`.
- E2E обновлены под новый контракт.

## Изменённые файлы

- `backend/src/common/dto/pagination-query.dto.ts` (новый)
- `backend/src/clients/clients.service.ts`, `clients.controller.ts`
- `backend/src/trainers/trainers.service.ts`, `trainers.controller.ts`
- `backend/src/reception/reception.service.ts`, `reception.controller.ts`
- `backend/src/workouts/workouts.service.ts`, `workouts.controller.ts`,
  `dto/trainer-workouts-query.dto.ts`, `dto/client-workouts-query.dto.ts`
- `backend/src/chats/chats.service.ts`, `chats.controller.ts`
- `backend/src/notifications/notifications.service.ts`,
  `notifications.controller.ts`
- e2e: `client-trainers`, `reception`, `notifications`, `workouts`
- `web-admin/src/types/pagination.ts` (новый)
- `web-admin/src/pages/Clients`, `Trainers`, `reception/Clients`,
  `reception/Trainers`, `Chats`, `Reports/useReportLookups`
- `mobile/lib/features/chats/chat_api.dart`,
  `notifications/notification_api.dart`,
  `workouts/workouts_api.dart`,
  `client/client_workouts_api.dart`

## Ссылки

- Тесты: `docs/019_tests_pagination.md`
- Функционал: `docs/readme.md`, раздел 019

## Отклонения от плана

UI-переключатели страниц в таблицах web-admin не добавлялись: таблицы
запрашивают до 100 записей, API готов к постраничной навигации. Это
зафиксировано как следующий шаг.
