# New 1 — разделение ролей и мультизальность

Дата: 2026-11-11
Источники: `docs/tehzadanie.md`, `docs/er.md`, `docs/api.md`, `backend/prisma/schema.prisma`.
Статус: частично реализовано (см. раздел 6).

## 1. Анализ новых требований

### 1.1. Роли и их права

| Роль | Интерфейс | Что видит | Что делает |
|---|---|---|---|
| ADMIN | Web | Всё, все залы | Всё, что было + создаёт ресепшен |
| RECEPTION | Web | Только свой зал | Создаёт клиентов/тренеров своего зала, назначает связи, добавляет фото, назначает тренера клиенту |
| TRAINER | Mobile | Свои залы + своих клиентов | Работа с клиентами (как раньше) |
| CLIENT | Mobile | Свои залы + свои тренировки | Может ходить в несколько залов, выбирать тренера |

### 1.2. Проблемы текущей модели

- Trainer не привязан к залам (только через `ClientTrainer.gymId`).
- `ClientTrainer.gymId` — один зал на связь, клиент может ходить в несколько залов.
- Нет сущности `Reception` / `ReceptionGym`.
- Нет фото у `Client` и `Trainer` (было только `GymEquipment.photoUrl`).
- `ClientTrainer` не хранит, кто назначил (клиент, ресепшен, админ).
- Нет выбора тренера клиентом.

### 1.3. Изменения модели данных

Каноническое описание — `docs/er.md`. Добавлены/изменены:

- `TrainerGym` — тренер в нескольких залах;
- `ClientGym` — клиент в нескольких залах;
- `ClientTrainer.assignedBy`, `ClientTrainer.assignedById`;
- `Client.photoUrl`, `Trainer.photoUrl`.

Не реализовано: `Role.RECEPTION` и модель `Reception` (в `docs/er.md` помечены как планируемые).

### 1.4. Изменения API

Реализованные эндпоинты описаны в `docs/api.md` (раздел multi-gym):

- `GET/POST/DELETE /admin/trainers/{id}/gyms`;
- `GET/POST/DELETE /admin/clients/{id}/gyms`;
- `GET /trainer/gyms`;
- `GET /client/gyms`, `GET /client/gyms/{gymId}/trainers`;
- `POST /client/gyms/{gymId}/trainers/{trainerId}/link`;
- `GET /client/trainers`, `DELETE /client/trainers/{linkId}`.

Планируемые и пока не реализованные:

```text
POST/GET/PUT/DELETE /admin/receptions
POST/GET/PUT /reception/clients
POST /reception/clients/:id/photo
POST/GET/PUT /reception/trainers
POST /reception/trainers/:id/photo
POST/DELETE /reception/clients/:id/trainers
```

Изменения существующих эндпоинтов: `photoUrl` в `POST /admin/clients` и `POST /admin/trainers`; фильтр `gymId` в `GET /admin/clients` и `GET /admin/trainers`; `gymId` в ответе `GET /trainer/clients`; проверка общего зала в `POST /trainer/workouts`.

### 1.5. Изменения в web-admin

- Страница `Receptions` (ADMIN) — CRUD, привязка к залу.
- `ReceptionLayout` — отдельный layout для роли RECEPTION.
- Страницы `reception/Clients` и `reception/Trainers` — только свой зал.
- В карточках тренера/клиента — управление залами.
- В карточке клиента — назначение тренера с отображением `assignedBy`.
- Загрузка фото клиента/тренера.
- Меню по роли (ADMIN vs RECEPTION).

### 1.6. Изменения в mobile (Flutter)

Trainer:

- экран «Мои залы» (`GET /trainer/gyms`);
- фильтр клиентов по залу;
- выбор зала из своих при создании тренировки;
- отображение `assignedBy` в карточке клиента.

Client:

- экран «Мои залы» (`GET /client/gyms`);
- выбор тренера в зале (`GET /client/gyms/:gymId/trainers` → `POST link`);
- отображение, кто назначил тренера (`assignedBy`);
- календарь с фильтром по залу.

## 2. План работ по спринтам

Легенда: `[x]` — сделано, `[~]` — частично, `[ ]` — не сделано.

### Спринт 5. Модель данных и права (backend)

| # | Статус | Задача | Артефакты | Критерий готовности |
|---|---|---|---|---|
| 5.1 | [~] | `TrainerGym`, `ClientGym`, `assignedBy/assignedById`, `photoUrl` у Client/Trainer | `backend/prisma/schema.prisma`, миграция | Сделано; `Role.RECEPTION` и `Reception` — нет |
| 5.2 | [ ] | Seed: админ + опционально тестовый ресепшен | `backend/prisma/seed.ts` | `make seed` идемпотентен |
| 5.3 | [ ] | Auth: роль RECEPTION в JWT, `RolesGuard` | `backend/src/auth/` | e2e: ресепшен без доступа к admin |
| 5.4 | [ ] | Модуль Receptions: CRUD (ADMIN), привязка к залу | `backend/src/receptions/` | e2e: создание, 403 для не-админа |
| 5.5 | [x] | TrainerGyms: привязка/отвязка тренера к залам | `backend/src/gym-links/` | `GET/POST/DELETE /admin/trainers/:id/gyms` |
| 5.6 | [x] | ClientGyms: привязка/отвязка клиента к залам | `backend/src/gym-links/` | `GET/POST/DELETE /admin/clients/:id/gyms` |
| 5.7 | [~] | ClientTrainer: `assignedBy`, `assignedById`, проверка зала | `backend/src/client-trainers/`, `gym-links` | CLIENT и ADMIN — да, RECEPTION — нет |
| 5.8 | [x] | `GET /trainer/clients` — только свои, фильтр `gymId` | `backend/src/trainer-clients/` | Фильтр `gym_id` работает |
| 5.9 | [x] | `POST /trainer/workouts` — проверка общего зала | `backend/src/workouts/` | `assertActiveLink` + проверка `TrainerGym` |
| 5.10 | [ ] | Эндпоинты `/reception/*` | `backend/src/reception/` | Изоляция по залу |
| 5.11 | [~] | Загрузка фото клиента/тренера | `backend/src/upload/`, DTO | Есть общий `/admin/upload`, отдельных `/reception/.../photo` нет |
| 5.12 | [x] | `/client/gyms`, тренеры зала, выбор тренера | `backend/src/gym-links/` | `assignedBy=CLIENT` |

### Спринт 6. Web-admin — ресепшен и мультизальность

| # | Статус | Задача | Артефакты |
|---|---|---|---|
| 6.1 | [ ] | Страница Receptions (ADMIN) | `web-admin/src/pages/Receptions/` |
| 6.2 | [ ] | ReceptionLayout для роли RECEPTION | `web-admin/src/layouts/ReceptionLayout.tsx` |
| 6.3 | [ ] | ReceptionClients — клиенты своего зала | `web-admin/src/pages/reception/Clients.tsx` |
| 6.4 | [ ] | ReceptionTrainers — тренеры своего зала | `web-admin/src/pages/reception/Trainers.tsx` |
| 6.5 | [ ] | Управление залами тренера (ADMIN) | `web-admin/src/pages/Trainers/GymsDrawer.tsx` |
| 6.6 | [ ] | Управление залами клиента | `web-admin/src/pages/Clients/GymsDrawer.tsx` |
| 6.7 | [~] | Назначение тренера с `assignedBy` | Drawer назначения есть, `assignedBy` не отображается |
| 6.8 | [ ] | Загрузка фото клиента/тренера | `web-admin/src/pages/Clients/PhotoUpload.tsx` |
| 6.9 | [ ] | Меню по роли (ADMIN vs RECEPTION) | `web-admin/src/router.tsx` |

### Спринт 7. Mobile — тренер (свои залы)

| # | Статус | Задача | Артефакты |
|---|---|---|---|
| 7.1 | [ ] | Экран «Мои залы» | `mobile/lib/features/trainer/gyms/` |
| 7.2 | [ ] | Фильтр клиентов по залу | `mobile/lib/features/trainer/clients/` |
| 7.3 | [ ] | Выбор зала при создании тренировки | `mobile/lib/features/trainer/workouts/create/` |
| 7.4 | [ ] | Отображение `assignedBy` в карточке клиента | `mobile/lib/features/trainer/clients/detail/` |

### Спринт 8. Mobile — клиент (выбор тренера, мультизальность)

| # | Статус | Задача | Артефакты |
|---|---|---|---|
| 8.1 | [ ] | Экран «Мои залы» | `mobile/lib/features/client/gyms/` |
| 8.2 | [ ] | Выбор тренера в зале | `mobile/lib/features/client/trainers/` |
| 8.3 | [ ] | Отображение связи с тренером (`assignedBy`) | `mobile/lib/features/client/profile/` |
| 8.4 | [ ] | Календарь с фильтром по залу | `mobile/lib/features/client/calendar/` |

### Спринт 9. Тесты и приёмка

| # | Статус | Задача | Артефакты |
|---|---|---|---|
| 9.1 | [ ] | e2e: receptions CRUD, права | `backend/src/receptions/receptions.e2e-spec.ts` |
| 9.2 | [ ] | e2e: trainer-gyms, client-gyms | `backend/src/gym-links/*.e2e-spec.ts` |
| 9.3 | [~] | e2e: client-trainers `assignedBy` | CLIENT/ADMIN есть, RECEPTION нет |
| 9.4 | [ ] | e2e: reception isolation | `backend/src/reception/*.e2e-spec.ts` |
| 9.5 | [x] | e2e: trainer isolation | `backend/src/trainer-clients/*.e2e-spec.ts` |
| 9.6 | [x] | e2e: workout cross-gym check | `backend/src/workouts/*.e2e-spec.ts` |
| 9.7 | [ ] | UI-smoke: админ → ресепшен → клиент/тренер | Ручной чек-лист |
| 9.8 | [ ] | UI-smoke: клиент выбирает тренера | Ручной чек-лист |
| 9.9 | [ ] | UI-smoke: тренер видит только свои залы/клиентов | Ручной чек-лист |
| 9.10 | [~] | Обновить `docs/er.md`, `docs/api.md`, `AGENTS.md` | er/api обновлены, AGENTS — без ролей |

## 3. Матрица доступа (итоговая)

| Действие | ADMIN | RECEPTION | TRAINER | CLIENT |
|---|---|---|---|---|
| Создать зал | ✅ | ❌ | ❌ | ❌ |
| Создать ресепшен | ✅ | ❌ | ❌ | ❌ |
| Создать тренера | ✅ | ✅ (свой зал) | ❌ | ❌ |
| Создать клиента | ✅ | ✅ (свой зал) | ❌ | ❌ |
| Привязать тренера к залу | ✅ | ✅ (свой зал) | ❌ | ❌ |
| Привязать клиента к залу | ✅ | ✅ (свой зал) | ❌ | ❌ |
| Назначить тренера клиенту | ✅ | ✅ (свой зал) | ❌ | ✅ (выбрать) |
| Загрузить фото клиента/тренера | ✅ | ✅ (свой зал) | ❌ | ❌ |
| Видеть всех клиентов | ✅ | ❌ | ❌ | ❌ |
| Видеть клиентов своего зала | ✅ | ✅ | ❌ | ❌ |
| Видеть своих клиентов | ✅ | ❌ | ✅ | ❌ |
| Видеть свои залы | ✅ | ✅ (один) | ✅ | ✅ |
| Создать тренировку | ✅ | ❌ | ✅ (свои клиенты) | ❌ |
| Назначить питание | ✅ | ❌ | ✅ (свои клиенты) | ❌ |
| Добавить замер веса | ✅ | ❌ | ✅ (свои клиенты) | ❌ |
| Видеть отчёты | ✅ | ❌ | ✅ (свои клиенты) | ✅ (свои) |
| Чат | ✅ | ❌ | ✅ (свои клиенты) | ✅ (свой тренер/админ) |
| Broadcast уведомления | ✅ | ❌ | ❌ | ❌ |

## 4. Риски и замечания

- Ресепшен в web-admin — нужен отдельный layout и guard в роутере; нельзя переиспользовать admin-страницы без фильтрации по `gymId`.
- `ClientTrainer.gymId` привязан к залу; при создании тренировки тренер должен быть в том же зале, что и связь.
- Клиент выбирает тренера сам — `POST /client/gyms/:gymId/trainers/:trainerId/link`, тренер должен быть активен в этом зале.
- Фото клиента/тренера — переиспользовать `POST /admin/upload`, добавив проверку прав (ресепшен — только свой зал).
- Мультизальность тренера — `TrainerGym` + проверка в `POST /trainer/workouts`.
- Миграция данных — существующие `ClientTrainer` заполнены `assignedBy='ADMIN'`, `assignedById=NULL`.
- Seed — добавить тестового ресепшена для smoke-тестов.
- Документация — `docs/er.md` и `docs/api.md` обновлены; `AGENTS.md` — правила по ролям ещё нет.
- FCM — ресепшен не отправляет broadcast (только админ).
- Порядок работ — backend (Спринт 5), web-admin (Спринт 6), mobile (Спринты 7–8), тесты (Спринт 9).

## 5. Рекомендуемый порядок дальнейших шагов

1. Спринт 5.1–5.3 — `Role.RECEPTION`, `Reception`, seed, auth.
2. Спринт 5.4–5.6 — Receptions, TrainerGyms, ClientGyms.
3. Спринт 5.7–5.9 — `ClientTrainer`, `trainer-clients`, `workouts`.
4. Спринт 5.10–5.12 — reception-эндпоинты, фото, выбор тренера клиентом.
5. Спринт 6 — web-admin: Receptions, ReceptionLayout, мультизальность.
6. Спринт 7–8 — mobile: тренер и клиент.
7. Спринт 9 — e2e, UI-smoke, документация, тег sprint-5.

Критический путь: 5.1 → 5.3 → 5.4 → 5.7 → 5.9 → 6.1 → 6.3 → 9.1 → 9.4.

## 6. Результат проверки (2026-11-11)

Проверено по `backend/prisma/schema.prisma`, `backend/src/gym-links/`, `backend/src/client-trainers/`, `backend/src/trainer-clients/`, `backend/src/workouts/`, `web-admin/src/pages/`, `mobile/lib/features/`.

Сделано:

- миграция `backend/prisma/migrations/20261111120000_multi_gym/`;
- `TrainerGym`, `ClientGym`, `ClientTrainer.assignedBy/assignedById`, `Client.photoUrl`, `Trainer.photoUrl`;
- модуль `backend/src/gym-links/` со всеми эндпоинтами из п. 1.4;
- `assignedBy=CLIENT` при выборе тренера клиентом, `assignedBy=ADMIN` при назначении админом;
- фильтр `gym_id` в `GET /trainer/clients` и проверка общего зала в `POST /trainer/workouts`.

Не сделано (перенесено в `docs/plan1.md`):

- `Role.RECEPTION` и модель `Reception`;
- модуль `backend/src/receptions/` и эндпоинты `/reception/*`;
- seed тестового ресепшена;
- web-admin: Receptions, ReceptionLayout, reception-страницы, управление залами, фото, меню по роли;
- mobile: экраны «Мои залы», фильтр по залу, выбор тренера, `assignedBy`;
- e2e для receptions и gym-links; UI-smoke.
