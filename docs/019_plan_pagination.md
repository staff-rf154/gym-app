# План 019 — пагинация списков

## Цель

Списки клиентов, тренеров, тренировок, чатов и уведомлений отдают
`{ items, total, page, limit }`; клиенты передают `page` и `limit`.

## Шаги

1. [ ] Общий `PaginationQueryDto` и тип `PaginatedResponse<T>`.
2. [ ] Backend: clients, trainers (admin + reception).
3. [ ] Backend: trainer/client workouts, chats, notifications.
4. [ ] Web-admin: обновить загрузку списков и серверную пагинацию таблиц.
5. [ ] Mobile: разбор `items` для чатов, уведомлений и тренировок.
6. [ ] Обновить e2e под новый контракт, прогнать тесты.
7. [ ] Зафиксировать tests/result и `docs/readme.md`.

## Критерии готовности

- `GET` списков без параметров возвращает 20 элементов и `total`.
- `limit > 100` → 400; `page=0` → 400.
- Существующие фильтры (gym, client, date) комбинируются с пагинацией.
- Web-admin и mobile корректно читают `items`.
- e2e зелёные.
