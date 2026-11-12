# Plan 6 — справочник целей и отчёты по посещаемости, тренажёрам и тренерам

Дата создания: 2026-11-12
Источник: «добавь в планы клиентам добавить цель из справочника отдельную вкладку для
заполнения; админу и рецепшен и тренеру добавить отчеты по посещаемости, по видам
тренажеров какой клиент как часто занимается на тренажере чтобы видеть на каком
меньше всего занимаются на каком больше чтобы можно было посмотреть отчеты по
динамике, отчет по тренеру сколько посещений его клиентов».
По ходу работ отмечай пункты `[x]`.

## Принятые решения

- Справочник целей — глобальный (не привязан к залу), управление в web-admin,
  вкладка выбора цели — в мобильном приложении клиента.
- Посещение = тренировка со статусом `DONE`.
- Отчёт по тренажёрам группируется и по `GymEquipment.type`, и по конкретному
  `GymEquipment` (с детализацией по клиентам).
- Отчёты доступны в web-admin для `ADMIN`, `RECEPTION`, `TRAINER`. Сейчас web-admin
  пускает только `ADMIN`/`RECEPTION` (`web-admin/src/router.tsx`, `ALLOWED_ROLES`),
  поэтому доступ `TRAINER` нужно добавить точечно — только к отчётам.
- Реализацию не начинать без отдельного согласования.

## 1. Справочник целей и вкладка «Цель» у клиента (P0)

Требование: у клиента цель выбирается из справочника, а не вводится свободным
текстом; для заполнения цели есть отдельная вкладка.

Текущее состояние:

- `Client.goal` — свободный текст, `backend/prisma/schema.prisma:141`.
- `CreateClientDto.goal` — строка до 200 символов,
  `backend/src/clients/dto/create-client.dto.ts:60-64`; `UpdateClientDto`
  наследует его через `PartialType`.
- Справочника целей нет.
- У клиента в мобильном приложении 5 вкладок: «Календарь», «Питание», «Отчёты»,
  «Чаты», «Настройки» — `mobile/lib/features/client/client_home_screen.dart:38-44`.

### Backend

- [x] Добавить модель `Goal`:
  - `id uuid PK`, `name text UNIQUE`, `description text?`,
    `isActive bool default true`, `sortOrder int default 0`,
    `createdAt timestamptz`, `updatedAt timestamptz`.
- [x] В `Client` добавить `goalId uuid? FK→Goal` (индекс `goalId`), существующее
  поле `goal text?` оставить как legacy для обратной совместимости.
- [x] Миграция:
  - создать таблицу `Goal`;
  - добавить `Client.goalId`;
  - backfill: создать цели из существующих `Client.goal` (`Похудение`, `Тонус`,
    `Набор массы` и др. из `backend/src/demo/demo.service.ts`), проставить
    `goalId` по совпадению текста, не терять исходный текст.
- [x] Новый модуль `backend/src/goals/`:
  - `GET /admin/goals` — список (включая неактивные), роль `ADMIN`;
  - `POST /admin/goals`, `PUT /admin/goals/:id`, `DELETE /admin/goals/:id` —
    роль `ADMIN`;
  - `GET /goals` — активные цели, роли `CLIENT`, `RECEPTION`, `TRAINER`, `ADMIN`;
  - `GET /client/goal` — текущая цель клиента (объект цели или `null`);
  - `PUT /client/goal` — тело `{ goalId: uuid }`, роль `CLIENT`, только активная
    цель, обновляет `Client.goalId` и синхронизирует legacy `goal` текстом цели.
- [x] `ClientResponse`, `trainer-clients.service.ts:132` и
  `clients.service.ts:292` — отдавать `goal` объектом `{ id, name, description }`
  (или `null`), сохранить совместимость со старыми потребителями.
- [x] `CreateClientDto`/`UpdateClientDto`: добавить `goalId?: uuid`, валидировать
  существование и `isActive`; свободный текст `goal` оставить устаревшим, но не
  удалять в этой задаче.

### Web-admin

- [x] Страница «Цели» (`web-admin/src/pages/Goals/`) — CRUD справочника, роль
  `ADMIN`; маршрут и пункт меню в `web-admin/src/router.tsx`,
  `web-admin/src/layouts/MainLayout.tsx`.
- [x] В формах клиента (`web-admin/src/pages/Clients/`) заменить ввод цели на
  `Select` из `GET /admin/goals`; для `RECEPTION` — из `GET /goals`.
- [x] В таблице/карточке клиента показывать название цели.

### Мобильное приложение 
мобильное приложение не трогаем
- [ ] `mobile/lib/features/client/client_goal_tab.dart` — отдельная вкладка
  «Цель»: текущая цель, выбор из списка активных целей, сохранение, пустое
  состояние «Цель не выбрана». 
- [ ] `mobile/lib/features/client/client_goal_api.dart` и провайдер — `GET
  /client/goal`, `GET /goals`, `PUT /client/goal`.
- [ ] `client_home_screen.dart` — добавить вкладку «Цель» в `_titles`,
  `IndexedStack` и `NavigationBar`.
- [ ] Карточка клиента у тренера (`mobile/lib/features/clients/client_card_screen.dart:198`)
  — показывать название цели из справочника.

Критерий приёмки:

- админ управляет глобальным справочником целей;
- клиент выбирает цель из справочника на отдельной вкладке, выбор сохраняется;
- рецепшен и тренер видят название цели клиента;
- существующие клиенты с текстовой целью не теряют данные после миграции.

## 2. Отчёт по посещаемости (P0)

Требование: `ADMIN`, `RECEPTION`, `TRAINER` видят отчёт по посещаемости и его
динамику.

Текущее состояние:

- `backend/src/reports/reports.controller.ts:18` —
  `@Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)`, роли `RECEPTION` нет.
- Существующие отчёты: динамика веса, прогресс по упражнению, сводка упражнений
  (`backend/src/reports/reports.service.ts`); посещаемости нет.
- `Workout.status` (`PLANNED`/`IN_PROGRESS`/`DONE`/`SKIPPED`),
  `backend/prisma/schema.prisma:37,273`; поля `startedAt`/`finishedAt` нет.

### Backend

- [x] Разрешить `RECEPTION` в `ReportsController` и добавить helper определения
  области видимости:
  - `ADMIN` — все залы;
  - `RECEPTION` — только свой зал (`Reception.gymId`);
  - `TRAINER` — только клиенты по активной связи `ClientTrainer`.
- [x] `GET /reports/attendance`:
  - query: `from`, `to`, `gym_id?`, `trainer_id?`, `client_id?`,
    `group_by=day|week|month` (по умолчанию `day`);
  - посещение = `Workout.status = DONE` в диапазоне `Workout.date`;
  - ответ: `totalVisits`, `uniqueClients`, `dynamics[]`
    (`period`, `visits`, `uniqueClients`), `byClient[]`
    (`clientId`, `clientName`, `visits`, `lastVisitDate`);
  - `RECEPTION` не может запросить чужой `gym_id` (`403`);
  - `TRAINER` не может запросить чужого `client_id`/`trainer_id` (`403`).
- [x] Отчёт не должен учитывать `PLANNED`/`IN_PROGRESS`/`SKIPPED`.

### Web-admin

- [x] Страница «Посещаемость» (`web-admin/src/pages/Reports/Attendance.tsx`):
  фильтры периода, зала, тренера, клиента; карточки итогов; график динамики;
  таблица по клиентам.

Критерий приёмки:

- посещения считаются по `DONE`;
- динамика строится по дням/неделям/месяцам;
- рецепшен видит только свой зал, тренер — только своих клиентов;
- админ видит все залы.

## 3. Отчёт по тренажёрам (P0)

Требование: видеть, какой клиент как часто занимается на тренажёре, какие
тренажёры/виды используются меньше и больше, и динамику.

Текущее состояние:

- `GymEquipment.type enum[MACHINE,FREE_WEIGHT,CARDIO,OTHER]`,
  `backend/prisma/schema.prisma:92`;
- `WorkoutItem.equipmentId uuid?` и `exerciseId`,
  `backend/prisma/schema.prisma:294`; факт выполнения — `WorkoutItemResult`.

### Backend

- [x] `GET /reports/equipment-usage`:
  - query: `from`, `to`, `gym_id?`, `trainer_id?`, `client_id?`,
    `group_by=type|equipment|client`, `group_by` по умолчанию `equipment`,
    `period=day|week|month` для динамики;
  - учитывать только `Workout.status = DONE` и `WorkoutItem.equipmentId != null`;
  - ответ:
    - `byType[]` — `type`, `usageCount`, `uniqueClients`, `share`;
    - `byEquipment[]` — `equipmentId`, `equipmentName`, `type`,
      `usageCount`, `uniqueClients`, `share`;
    - `byClient[]` — `clientId`, `clientName`, `equipmentId`, `equipmentName`,
      `usageCount`, `lastUsedDate`;
    - `dynamics[]` — `period`, `usageCount` (опционально с разбивкой по типам);
    - `leastUsed`/`mostUsed` — ссылки на элементы `byEquipment`;
  - сортировка по `usageCount` по возрастанию и убыванию на клиенте.
- [x] Учесть упражнения без `equipmentId` (свободный вес/собственный вес) как
  отдельную группу «Без тренажёра» либо явно исключить — зафиксировать в
  `docs/api.md` выбранное поведение.
- [x] Область видимости — как в п. 2 (`ADMIN`/`RECEPTION`/`TRAINER`).

### Web-admin

- [x] Страница «Тренажёры» (`web-admin/src/pages/Reports/Equipment.tsx`):
  - сводка по типам (доли, «самый/наименее используемый»);
  - рейтинг конкретных тренажёров;
  - фильтр по клиенту и таблица «клиент — тренажёр — количество»;
  - график динамики.

Критерий приёмки:

- видно распределение по типам и по конкретным тренажёрам;
- видно, какие тренажёры используются меньше/больше всего;
- можно отфильтровать по клиенту и посмотреть динамику.

## 4. Отчёт по тренеру (P0)

Требование: отчёт, сколько посещений у клиентов тренера.

### Backend

- [x] `GET /reports/trainers`:
  - query: `from`, `to`, `gym_id?`, `trainer_id?`;
  - по каждому тренеру: `trainerId`, `trainerName`, `visits`
    (`Workout.status = DONE`, `Workout.trainerId = trainer.id`),
    `uniqueClients`, `clients[]` (`clientId`, `clientName`, `visits`);
  - `RECEPTION` — только тренеры своего зала (через `TrainerGym`/`ClientTrainer`);
  - `TRAINER` — только своя строка, без доступа к другим (`403` при чужом
    `trainer_id`);
  - `ADMIN` — все тренеры, фильтр по залу.

### Web-admin

- [x] Страница «Тренеры» (`web-admin/src/pages/Reports/Trainers.tsx`): период,
  зал, таблица тренеров с числом посещений и уникальных клиентов, раскрытие по
  клиентам.

Критерий приёмки:

- админ и рецепшен видят посещения по всем доступным тренерам;
- тренер видит только свои посещения;
- данные совпадают с отчётом по посещаемости за тот же период.

## 5. Доступ тренера в web-admin к отчётам (P1)

Текущее состояние: `web-admin/src/router.tsx` — `ALLOWED_ROLES = ['ADMIN',
'RECEPTION']`, тренер получает `Forbidden`.

- [x] Добавить `TRAINER` в `ALLOWED_ROLES`.
- [x] `homeFor` для `TRAINER` — страница отчётов.
- [x] Маршруты отчётов — `RoleRoute roles={['ADMIN','RECEPTION','TRAINER']}`;
  остальные админские маршруты для тренера недоступны.
- [x] `MainLayout` — для тренера показывать только пункты отчётов; скрыть
  управление клиентами, залами, тренажёрами, целями и т.д.
- [x] Backend уже ограничивает данные по роли; UI-скрытие вторично.

## 6. Тесты и документация

- [x] `backend/src/goals/goals.e2e-spec.ts`:
  - CRUD справочника только `ADMIN`;
  - клиент видит только активные цели;
  - клиент сохраняет цель, `goalId` и legacy `goal` синхронизированы;
  - неактивную/несуществующую цель выбрать нельзя (`400`/`404`);
  - рецепшен и тренер видят цель клиента.
- [x] `backend/src/reports/attendance.e2e-spec.ts`:
  - `DONE` учитывается, остальные статусы — нет;
  - динамика по `day`/`week`/`month`;
  - рецепшен ограничен своим залом, тренер — своими клиентами;
  - `ADMIN` видит все залы.
- [x] `backend/src/reports/equipment-usage.e2e-spec.ts`:
  - группировка по типу и конкретному тренажёру;
  - `leastUsed`/`mostUsed`;
  - фильтр по клиенту;
  - чужие данные для рецепшен/тренера недоступны (`403`).
- [x] `backend/src/reports/trainers.e2e-spec.ts`:
  - посещения считаются по клиентам тренера;
  - тренер видит только себя;
  - админ/рецепшен — согласно области видимости.
- [x] `docs/api.md` — новые эндпоинты `/admin/goals`, `/goals`, `/client/goal`,
  `/reports/attendance`, `/reports/equipment-usage`, `/reports/trainers`,
  коды `400/403/404`, правила области видимости.
- [x] `docs/er.md` — модель `Goal`, `Client.goalId`, посещение = `DONE`.
- [x] `mobile/test/ui_smoke_test.dart` — вкладка «Цель» и выбор цели.
- [x] `web-admin` — тесты/сборка страниц отчётов и справочника целей.

## Проверки перед закрытием плана

- [x] `cd backend && npx tsc --noEmit -p tsconfig.json`
- [x] `cd backend && pnpm test:e2e`
- [x] `cd web-admin && pnpm lint && pnpm build`
- [x] `cd mobile && flutter analyze && flutter test`
