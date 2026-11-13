# План 018 — замеры веса для ADMIN и RECEPTION

## Цель

ADMIN добавляет замеры любому клиенту; RECEPTION — клиентам своего зала.
Web-admin показывает форму и для администратора, и для ресепшена.

## Шаги

1. [ ] `WeightMeasurementsService`: методы создания для ADMIN и RECEPTION
   с проверкой зала.
2. [ ] `ReceptionService`/`ReceptionController`: GET/POST замеров клиента
   своего зала.
3. [ ] `AdminWeightMeasurementsController`: вернуть POST.
4. [ ] Web-admin: вернуть форму на странице замеров, выбрать API по роли;
   добавить кнопку «Вес» в список клиентов ресепшена и маршрут.
5. [ ] Обновить e2e для ADMIN/RECEPTION и прогнать тесты.
6. [ ] Зафиксировать tests/result и `docs/readme.md`.

## Критерии готовности

- ADMIN: POST/GET `/admin/clients/:id/weight-measurements` — 201/200.
- RECEPTION: POST/GET `/reception/clients/:id/weight-measurements` — 201/200
  только для клиента своего зала; чужой клиент → 403.
- Тренер работает как раньше.
- Форма в web-admin доступна ADMIN и RECEPTION.
- e2e проходят.
