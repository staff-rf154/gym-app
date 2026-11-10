План доработки Gym App: разделение ролей и мультизальность
1. Анализ новых требований
1.1. Новые роли и их права
Роль	Интерфейс	Что видит	Что делает
ADMIN	Web	Всё, все залы	Всё, что было + создаёт ресепшен
RECEPTION	Web (или mobile?)	Только свой зал	Создаёт клиентов/тренеров своего зала, назначает связи, добавляет фото клиентам/тренерам, назначает тренера клиенту
TRAINER	Mobile	Свои залы + своих клиентов	Работа с клиентами (как раньше)
CLIENT	Mobile	Свои залы + свои тренировки	Может ходить в несколько залов, выбирать тренера
1.2. Ключевые изменения в модели данных
Проблемы текущей модели:

Trainer не привязан к залам (только через ClientTrainer.gymId — это связь клиент-тренер-зал, а не тренер-зал)

ClientTrainer.gymId — один зал на связь, но клиент может ходить в несколько залов

Нет сущности Reception / ReceptionGym

Нет фото у Client и Trainer (только GymEquipment.photoUrl)

ClientTrainer не хранит, кто назначил (клиент или ресепшен)

Нет выбора тренера клиентом

1.3. Предлагаемые изменения схемы Prisma
prisma
enum Role {
  ADMIN
  RECEPTION
  TRAINER
  CLIENT
}

model User {
  // ... как было
  role Role
  photoUrl String?  // фото пользователя (клиент/тренер)
}

model Reception {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  gymId     String   // ресепшен видит только свой зал
  gym       Gym      @relation(fields: [gymId], references: [id])
  createdAt DateTime @default(now()) @db.Timestamptz
}

// Тренер привязан к нескольким залам
model TrainerGym {
  id        String   @id @default(uuid())
  trainerId String
  gymId     String
  trainer   Trainer  @relation(fields: [trainerId], references: [id])
  gym       Gym      @relation(fields: [gymId], references: [id])
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @db.Timestamptz

  @@unique([trainerId, gymId])
  @@index([gymId, isActive])
}

// Клиент может ходить в несколько залов
model ClientGym {
  id        String   @id @default(uuid())
  clientId  String
  gymId     String
  client    Client   @relation(fields: [clientId], references: [id])
  gym       Gym      @relation(fields: [gymId], references: [id])
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @db.Timestamptz

  @@unique([clientId, gymId])
  @@index([gymId, isActive])
}

// Связь клиент-тренер: кто назначил, в каком зале
model ClientTrainer {
  id          String   @id @default(uuid())
  clientId    String
  trainerId   String
  gymId       String   // в каком зале эта связь (тренер должен быть в этом зале)
  isActive    Boolean  @default(true)
  assignedBy  String   // "CLIENT" | "RECEPTION" | "ADMIN"
  assignedById String? // userId того, кто назначил (для RECEPTION/ADMIN)
  createdAt   DateTime @default(now()) @db.Timestamptz

  @@unique([clientId, trainerId, gymId])
  @@index([gymId, isActive])
  @@index([trainerId, isActive])
  @@index([clientId, isActive])
}

// Фото клиента/тренера
model Client {
  // ...
  photoUrl String?
}

model Trainer {
  // ...
  photoUrl String?
}
1.4. Изменения в API
Новые эндпоинты:

text
# Admin
POST   /admin/receptions              # создать ресепшен (phone, name, gymId)
GET    /admin/receptions              # список ресепшен
PUT    /admin/receptions/:id
DELETE /admin/receptions/:id

POST   /admin/trainers/:id/gyms       # привязать тренера к залу
DELETE /admin/trainers/:id/gyms/:gymId
GET    /admin/trainers/:id/gyms

POST   /admin/clients/:id/gyms        # привязать клиента к залу
DELETE /admin/clients/:id/gyms/:gymId

# Reception (только свой зал)
POST   /reception/clients             # создать клиента (авто-привязка к своему залу)
GET    /reception/clients             # только клиенты своего зала
PUT    /reception/clients/:id
POST   /reception/clients/:id/photo   # загрузка фото клиента
POST   /reception/trainers            # создать тренера (авто-привязка к своему залу)
GET    /reception/trainers            # только тренеры своего зала
PUT    /reception/trainers/:id
POST   /reception/trainers/:id/photo
POST   /reception/clients/:id/trainers  # назначить тренера (assignedBy=RECEPTION)
DELETE /reception/clients/:id/trainers/:linkId

# Client — выбор тренера
GET    /client/gyms                   # залы, где клиент активен
GET    /client/gyms/:gymId/trainers   # тренеры в зале
POST   /client/gyms/:gymId/trainers/:trainerId/link  # клиент сам выбрал тренера (assignedBy=CLIENT)

# Trainer — только свои залы
GET    /trainer/gyms                  # залы, где тренер активен
GET    /trainer/clients?gymId=        # только свои клиенты (фильтр по залу)
Изменения в существующих:

POST /admin/clients — добавить photoUrl (опционально)

POST /admin/trainers — добавить photoUrl (опционально)

GET /admin/clients — фильтр по gymId

GET /admin/trainers — фильтр по gymId

GET /trainer/clients — добавить gymId в ответ

POST /trainer/workouts — проверять, что тренер и клиент в одном зале (через ClientTrainer.gymId)

1.5. Изменения в web-admin
Новые страницы:

Receptions — CRUD ресепшен, привязка к залу

TrainerGyms — управление залами тренера (в карточке тренера)

ClientGyms — управление залами клиента (в карточке клиента)

ReceptionLayout — отдельный layout для ресепшена (ограничен своим залом)

Изменения:

Trainers — добавить фото, управление залами

Clients — добавить фото, управление залами, отображение assignedBy в связях

MainLayout — меню по роли (ADMIN видит всё, RECEPTION — только свой зал)

1.6. Изменения в mobile (Flutter)
Trainer:

Экран «Мои залы» (GET /trainer/gyms)

Фильтр клиентов по залу

При создании тренировки — выбор зала из своих

Client:

Экран «Мои залы» (GET /client/gyms)

Выбор тренера в зале (GET /client/gyms/:gymId/trainers → POST link)

Отображение, кто назначил тренера (assignedBy)

2. План работ по спринтам
Спринт 5: Модель данных и права (backend)
#	Задача	Артефакты	Критерий готовности
5.1	Расширить schema.prisma: Role.RECEPTION, Reception, TrainerGym, ClientGym, ClientTrainer.assignedBy/assignedById, photoUrl у Client/Trainer	backend/prisma/schema.prisma, миграция	prisma migrate dev проходит, prisma generate без ошибок
5.2	Seed: создание админа + опционально тестового ресепшена	backend/prisma/seed.ts	make seed идемпотентен
5.3	Auth: поддержка роли RECEPTION в JWT, RolesGuard	backend/src/auth/	e2e: ресепшен не имеет доступа к admin-эндпоинтам
5.4	Модуль Receptions: CRUD (только ADMIN), привязка к залу	backend/src/receptions/	e2e: создание ресепшена, 403 для не-админа
5.5	Модуль TrainerGyms: привязка/отвязка тренера к залам (ADMIN, RECEPTION своего зала)	backend/src/trainer-gyms/	e2e: тренер в нескольких залах, ресепшен не может привязать к чужому залу
5.6	Модуль ClientGyms: привязка/отвязка клиента к залам	backend/src/client-gyms/	e2e: клиент в нескольких залах
5.7	Обновить ClientTrainer: assignedBy, assignedById, проверка что тренер в зале	backend/src/client-trainers/	e2e: клиент сам назначает тренера (assignedBy=CLIENT), ресепшен (assignedBy=RECEPTION)
5.8	Обновить GET /trainer/clients — только свои клиенты, фильтр по gymId	backend/src/trainer-clients/	e2e: тренер видит только клиентов своих залов
5.9	Обновить POST /trainer/workouts — проверка, что тренер и клиент в одном зале	backend/src/workouts/	e2e: 403 если тренер не в зале клиента
5.10	Эндпоинты /reception/* для клиентов и тренеров своего зала	backend/src/reception/	e2e: ресепшен видит только свой зал, 403 на чужой
5.11	Загрузка фото для клиента/тренера (photoUrl)	backend/src/upload/ + DTO	e2e: POST /reception/clients/:id/photo → photoUrl в БД
5.12	Эндпоинты /client/gyms, /client/gyms/:gymId/trainers, выбор тренера клиентом	backend/src/client/	e2e: клиент видит тренеров своих залов, может выбрать
Коммит: feat(backend): roles split, multi-gym, reception module

Спринт 6: Web-admin — ресепшен и мультизальность
#	Задача	Артефакты	Критерий готовности
6.1	Страница Receptions (ADMIN): CRUD, привязка к залу	web-admin/src/pages/Receptions/	Создание/редактирование/удаление, initial_password в ответе
6.2	ReceptionLayout — отдельный layout для роли RECEPTION	web-admin/src/layouts/ReceptionLayout.tsx	Ресепшен видит только свой зал в меню
6.3	Страница ReceptionClients — клиенты своего зала	web-admin/src/pages/reception/Clients.tsx	Только свой зал, создание с авто-привязкой
6.4	Страница ReceptionTrainers — тренеры своего зала	web-admin/src/pages/reception/Trainers.tsx	Только свой зал, создание с авто-привязкой
6.5	В карточке тренера — управление залами (ADMIN)	web-admin/src/pages/Trainers/GymsDrawer.tsx	Привязка/отвязка залов
6.6	В карточке клиента — управление залами (ADMIN + RECEPTION своего)	web-admin/src/pages/Clients/GymsDrawer.tsx	Привязка/отвязка залов
6.7	В карточке клиента — назначение тренера с assignedBy	web-admin/src/pages/Clients/TrainersDrawer.tsx	Отображение assignedBy, ресепшен назначает
6.8	Загрузка фото клиента/тренера	web-admin/src/pages/Clients/PhotoUpload.tsx	jpg/png/webp ≤5МБ, preview
6.9	Меню по роли (ADMIN vs RECEPTION)	web-admin/src/router.tsx	Ресепшен не видит admin-страниц
Коммит: feat(web): reception role, multi-gym management

Спринт 7: Mobile — тренер (свои залы)
#	Задача	Артефакты	Критерий готовности
7.1	Экран «Мои залы» (GET /trainer/gyms)	mobile/lib/features/trainer/gyms/	Список залов тренера
7.2	Фильтр клиентов по залу	mobile/lib/features/trainer/clients/	Dropdown зала, список фильтруется
7.3	Создание тренировки — выбор зала из своих	mobile/lib/features/trainer/workouts/create/	Только залы тренера
7.4	Отображение assignedBy в карточке клиента	mobile/lib/features/trainer/clients/detail/	Пометка «выбран клиентом» / «назначен ресепшеном»
Коммит: feat(mobile): trainer multi-gym

Спринт 8: Mobile — клиент (выбор тренера, мультизальность)
#	Задача	Артефакты	Критерий готовности
8.1	Экран «Мои залы» (GET /client/gyms)	mobile/lib/features/client/gyms/	Список залов клиента
8.2	Выбор тренера в зале	mobile/lib/features/client/trainers/	GET тренеров → POST link, assignedBy=CLIENT
8.3	Отображение связи с тренером (кто назначил)	mobile/lib/features/client/profile/	assignedBy в UI
8.4	Календарь с фильтром по залу	mobile/lib/features/client/calendar/	Dropdown зала
Коммит: feat(mobile): client gyms and trainer selection

Спринт 9: Тесты и приёмка
#	Задача	Артефакты	Критерий готовности
9.1	e2e: receptions CRUD, права	backend/src/receptions/receptions.e2e-spec.ts	Все сценарии
9.2	e2e: trainer-gyms, client-gyms	backend/src/trainer-gyms/*.e2e-spec.ts	Все сценарии
9.3	e2e: client-trainers assignedBy	backend/src/client-trainers/*.e2e-spec.ts	CLIENT/RECEPTION/ADMIN
9.4	e2e: reception isolation (только свой зал)	backend/src/reception/*.e2e-spec.ts	403 на чужой зал
9.5	e2e: trainer isolation (только свои клиенты)	backend/src/trainer-clients/*.e2e-spec.ts	403 на чужого клиента
9.6	e2e: workout cross-gym check	backend/src/workouts/*.e2e-spec.ts	403 если тренер не в зале клиента
9.7	UI-smoke: админ создаёт ресепшен → ресепшен входит → создаёт клиента/тренера своего зала	Ручной чек-лист	Все пункты
9.8	UI-smoke: клиент выбирает тренера в зале	Ручной чек-лист	Связь создана, assignedBy=CLIENT
9.9	UI-smoke: тренер видит только свои залы/клиентов	Ручной чек-лист	Нет чужих данных
9.10	Обновить docs/er.md, docs/api.md, AGENTS.md	Документация	Схема и API актуальны
Коммит: test: roles split and multi-gym green

Тег: sprint-5

3. Матрица доступа (итоговая)
Действие	ADMIN	RECEPTION	TRAINER	CLIENT
Создать зал	✅	❌	❌	❌
Создать ресепшен	✅	❌	❌	❌
Создать тренера	✅	✅ (свой зал)	❌	❌
Создать клиента	✅	✅ (свой зал)	❌	❌
Привязать тренера к залу	✅	✅ (свой зал)	❌	❌
Привязать клиента к залу	✅	✅ (свой зал)	❌	❌
Назначить тренера клиенту	✅	✅ (свой зал)	❌	✅ (выбрать)
Загрузить фото клиента/тренера	✅	✅ (свой зал)	❌	❌
Видеть всех клиентов	✅	❌	❌	❌
Видеть клиентов своего зала	✅	✅	❌	❌
Видеть своих клиентов	✅	❌	✅	❌
Видеть свои залы	✅	✅ (один)	✅	✅
Создать тренировку	✅	❌	✅ (свои клиенты)	❌
Назначить питание	✅	❌	✅ (свои клиенты)	❌
Добавить замер веса	✅	❌	✅ (свои клиенты)	❌
Видеть отчёты	✅	❌	✅ (свои клиенты)	✅ (свои)
Чат	✅	❌	✅ (свои клиенты)	✅ (свой тренер/админ)
Broadcast уведомления	✅	❌	❌	❌
4. Риски и замечания
Ресепшен в web-admin — нужен отдельный layout и guard в роутере; нельзя переиспользовать admin-страницы без фильтрации по gymId.

ClientTrainer.gymId — теперь связь привязана к залу; при создании тренировки тренер должен быть в том же зале, что и связь. Нужна проверка в POST /trainer/workouts.

Клиент выбирает тренера сам — нужен эндпоинт POST /client/gyms/:gymId/trainers/:trainerId/link с assignedBy=CLIENT; тренер должен быть активен в этом зале.

Фото клиента/тренера — переиспользовать POST /admin/upload, но добавить проверку прав (ресепшен — только свой зал).

Мультизальность тренера — TrainerGym + проверка в POST /trainer/workouts, что тренер и клиент в одном зале.

Миграция данных — существующие ClientTrainer нужно заполнить assignedBy='ADMIN' и assignedById=adminId (или NULL для старых).

Seed — добавить тестового ресепшена для smoke-тестов.

Документация — обновить docs/er.md (новые таблицы), docs/api.md (новые эндпоинты), AGENTS.md (правила по ролям).

FCM — ресепшен не отправляет broadcast (только админ), но может получать push? По ТЗ — нет, не нужно.

Порядок работ — сначала backend (Спринт 5), потом web-admin (Спринт 6), потом mobile (Спринты 7–8), затем тесты (Спринт 9). Mobile зависит от backend-эндпоинтов.

5. Рекомендуемый порядок дальнейших шагов
Спринт 5.1–5.3 — схема, миграция, seed, auth с RECEPTION. Это блокирует всё остальное.

Спринт 5.4–5.6 — модули Receptions, TrainerGyms, ClientGyms.

Спринт 5.7–5.9 — обновление ClientTrainer, trainer-clients, workouts (проверка зала).

Спринт 5.10–5.12 — reception-эндпоинты, фото, client-выбор тренера.

Спринт 6 — web-admin: Receptions, ReceptionLayout, мультизальность.

Спринт 7–8 — mobile: тренер и клиент.

Спринт 9 — e2e, UI-smoke, документация, тег sprint-5.

Критический путь: 5.1 → 5.3 → 5.4 → 5.7 → 5.9 → 6.1 → 6.3 → 9.1 → 9.4.