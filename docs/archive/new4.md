# New 4 — выполнение plan3 (остаток планов)

Дата: 2026-11-11
Запрос: «@docs/plan3.md выполняем все и не забываем помечать что выполнено».

## Что запланировано

- Закрыть этапы 0–4 из `docs/plan3.md` и отложенные пункты `plan2.md`.
- Reception: роль, модель, миграция, backend-модули, web-admin, seed, тесты.
- Web-admin: доделать BUG-2.20, залы/assignedBy/фото, роль-меню.
- Mobile: «Мои залы», выбор тренера, фильтр `gym_id`, assignedBy, push тренеру.
- Дашборд: агрегирующий backend-эндпоинт вместо N+1.
- Общие утилиты, удаление мёртвого кода, e2e-покрытие.

## Что сделано

- Backend reception: `Role.RECEPTION`, модель `Reception` (миграция `20261111140000_reception`), модули `backend/src/receptions/` (admin CRUD) и `backend/src/reception/` (свой зал, клиенты/тренеры, фото, привязка тренера с `assignedBy=RECEPTION`), upload доступен ADMIN/RECEPTION, seed ресепшена по env.
- Backend dashboard: `GET /admin/dashboard/stats`.
- Web-admin: страницы `Receptions`, `reception/Clients`, `reception/Trainers`; роль-маршруты и меню; `GymsDrawer`, `PhotoUpload`, `useCrudModal`; Alert/Empty/retry и `null` для опциональных полей; единые `constants/options.ts` и `utils/format.ts`.
- Mobile: `features/gyms/my_gyms_screen.dart` (свои залы, выбор/отвязка тренера), `core/utils/format.dart`, gym-фильтр в тренировках клиента, `assignedBy`, push-инициализация тренера, удалён `ClientWorkoutEquipment`.
- Security: сгенерированы секреты `.env`, `chmod 600`, startup-валидация env, `ThrottlerGuard`, лимиты login/refresh.
- Документация: обновлены `docs/er.md`, `docs/api.md`, заполнен `docs/plan3.md`.

## Результат

- Функциональность этапов 2–4 реализована; BUG-2.12 (порты/Redis) осознанно отложен.
- Проверки: backend `tsc`/`build`, web-admin `build`/`lint`, `flutter analyze`, `flutter test` (11/11), auth e2e — успешно.
- Ограничение: полный `pnpm test:e2e` требует применения миграций человеком; reception e2e написан, но не запускался на старом schema.

## Статус

- [x] Backend reception + dashboard.
- [x] Web-admin reception и паритет.
- [x] Mobile мультизальность.
- [x] Безопасность/конфигурация.
- [~] Полный e2e-прогон после миграций.

## Связанные документы

- `docs/plan3.md` — чекбоксы и журнал.
- `docs/test2.md` — проверки.
- `docs/er.md`, `docs/api.md` — модели и API.
