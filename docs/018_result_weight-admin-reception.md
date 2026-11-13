# Результат 018 — замеры веса для ADMIN и RECEPTION

**Статус:** выполнено.

## Что сделано

- `WeightMeasurementsService`: создание/просмотр замеров для ADMIN
  и RECEPTION; для ресепшена проверяется активная связь клиента с залом.
- `ReceptionController`: `GET/POST /reception/clients/:id/weight-measurements`.
- `AdminWeightMeasurementsController`: возвращён `POST` создания замера.
- Web-admin: страница замеров снова с формой; API и кнопка «Назад»
  выбираются по роли. Добавлен маршрут и кнопка «Вес» в списке клиентов
  ресепшена.
- E2E расширены проверками ADMIN/RECEPTION, включая запрет чужого зала.

## Изменённые файлы

- `backend/src/weight-measurements/weight-measurements.service.ts`
- `backend/src/weight-measurements/weight-measurements.controller.ts`
- `backend/src/weight-measurements/weight-measurements.module.ts`
- `backend/src/weight-measurements/weight-measurements.e2e-spec.ts`
- `backend/src/reception/reception.service.ts`
- `backend/src/reception/reception.controller.ts`
- `backend/src/reception/reception.module.ts`
- `web-admin/src/pages/ClientWeight/index.tsx`
- `web-admin/src/pages/reception/Clients.tsx`
- `web-admin/src/router.tsx`

## Ссылки

- Тесты: `docs/018_tests_weight-admin-reception.md`
- Функционал: `docs/readme.md`, раздел 018
- План: `docs/018_plan_weight-admin-reception.md`

## Отклонения от плана

Нет.
