# Bug 2 — аудит безопасности, логики, функциональности и уникальности

Дата: 2026-11-11
Область: `backend/`, `web-admin/`, `mobile/`, `docker-compose.yml`, `.env`.
Метод: чтение кода, `npx tsc --noEmit`, сверка DTO/контроллеров, сравнение `.env` и `.env.example` по хешам.
Статус: **находки зафиксированы, исправления не внесены**.

Легенда: P0 — критично, P1 — высокий риск, P2 — средний/качество.

---

## P0 — критично

### BUG-2.1. Секреты совпадают с публичным примером

- `.env` vs `.env.example`: `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD`, `DEFAULT_CLIENT_PASSWORD` — значения идентичны (проверено сравнением SHA-256, сами значения не выводились).
- `.env` не отслеживается git (хорошо), но права `644`.
- `backend/src/auth/strategies/jwt.strategy.ts:15-19`, `backend/src/common/guards/roles.guard.ts:24-28` — роль берётся из payload JWT.

Сценарий: зная секрет из примера, атакующий подписывает токен `{sub, role:"ADMIN"}` и получает полный доступ.

Исправление: сгенерировать случайные секреты (`openssl rand -base64 48`), убрать дефолты, падать на старте при `changeme*`, `chmod 600 .env`, инвалидировать выданные refresh-токены.

### BUG-2.2. Backend не проходит typecheck

`backend/src/clients/clients.service.ts:149,194` использует `dto.photoUrl`, но в `backend/src/clients/dto/create-client.dto.ts` поля нет.

```
src/clients/clients.service.ts(149,27): error TS2339: Property 'photoUrl' does not exist on type 'CreateClientDto'.
src/clients/clients.service.ts(194,27): error TS2339: Property 'photoUrl' does not exist on type 'UpdateClientDto'.
```

Следствие: `nest build` и CI падают; фото клиента не работает.

Исправление: добавить `photoUrl?: string` в `CreateClientDto` (по аналогии с `backend/src/trainers/dto/create-trainer.dto.ts:16`) либо убрать использование из сервиса.

### BUG-2.3. Один пароль на всех клиентов/тренеров + нет смены пароля

- `backend/src/clients/clients.service.ts:129-171`, `backend/src/trainers/trainers.service.ts` — всем выдаётся `DEFAULT_CLIENT_PASSWORD`.
- `initial_password` возвращается в ответе API (`clients.service.ts:165`, `trainers.service.ts:92`).
- `backend/src/auth/auth.controller.ts` — эндпоинта смены/сброса пароля нет.

Сценарий: зная дефолтный пароль, войти в любой аккаунт, который его не менял; легально сменить пароль невозможно.

Исправление: генерировать уникальный случайный пароль, показывать один раз, добавить `POST /auth/change-password` с проверкой старого пароля и инвалидацией refresh-токенов.

### BUG-2.4. Rate limiting фактически отключён

- `backend/src/app.module.ts:47-52` — `ThrottlerModule.forRoot(...)` подключён.
- `backend/src/app.module.ts:59-67` — в `APP_GUARD` только `JwtAuthGuard` и `RolesGuard`, `ThrottlerGuard` отсутствует.
- `@Throttle` не используется; блокировки неудачных входов нет.

Сценарий: неограниченный брутфорс `POST /api/v1/auth/login` и `/auth/refresh`.

Исправление: зарегистрировать `ThrottlerGuard` глобально, отдельные лимиты на login/refresh (например 5/мин на IP+phone), задержка/блокировка после N ошибок.

---

## P1 — высокий риск

### BUG-2.5. Отзыв тренера из зала не отзывает доступ к клиентам

- `backend/src/gym-links/gym-links.service.ts:241-249` (`adminUnlinkTrainerGym`), `:284-292` (`adminUnlinkClientGym`) ставят `isActive=false` только в `TrainerGym`/`ClientGym`.
- Проверки доступа смотрят только `ClientTrainer.isActive`: `backend/src/workouts/workouts.service.ts:427-433`, `backend/src/nutrition/nutrition.service.ts:39-44`, `backend/src/reports/reports.service.ts:195-209`, `backend/src/weight-measurements/weight-measurements.service.ts:45-73`.

Сценарий: после `DELETE /admin/trainers/:id/gyms/:gymId` тренер продолжает читать/писать данные клиентов этого зала.

Исправление: каскадно деактивировать `ClientTrainer` по `(trainerId,gymId)` / `(clientId,gymId)` либо требовать активные `TrainerGym + ClientGym + ClientTrainer` во всех проверках.

### BUG-2.6. Удаление клиента/тренера падает 500

- `backend/src/clients/clients.service.ts:213-222` не удаляет `Workout`, `NutritionRecommendation`, `RefreshToken`, `Message`, `Notification`.
- `backend/src/trainers/trainers.service.ts:132-140` не удаляет `WorkoutTemplate`, `Workout`, `NutritionRecommendation`.
- FK `RESTRICT` → `P2003` → 500.

Сценарий: клиент вошёл (появился refresh-токен) → админ удаляет клиента → 500, клиент остаётся.

Исправление: транзакционная очистка зависимостей или soft-delete (`isActive`).

### BUG-2.7. Web-admin пускает любую роль

- `web-admin/src/router.tsx:18-26,32-108` — `ProtectedRoute` проверяет только наличие `access`.
- `web-admin/src/layouts/MainLayout.tsx:8-19` — одинаковое меню для всех.
- `web-admin/src/pages/Login.tsx:26-36` — роль после логина не проверяется.

Сценарий: CLIENT/TRAINER входят в веб-админку и видят интерфейс (API отвечает 403).

Исправление: guard по `user.role` (ADMIN/RECEPTION), отдельные меню/роуты, 403-страница, отклонять не-админские роли на логине.

### BUG-2.8. Токены в localStorage

- `web-admin/src/store/auth.ts:21-32` — `persist` хранит `access`, `refresh` (30 дней) и `user` в `localStorage`.

Сценарий: любая XSS крадёт обе валюты токенов.

Исправление: refresh в httpOnly-cookie, access в памяти; минимум не персистить refresh.

### BUG-2.9. ClientWeight не работает для админа

- `web-admin/src/pages/ClientWeight/index.tsx:52-75` вызывает `GET/POST /client/:id/weight-measurements`.
- `backend/src/weight-measurements/weight-measurements.controller.ts:18` — `@Roles(Role.TRAINER)`.

Сценарий: страница показывает пустую таблицу, добавление падает с 403.

Исправление: отдельный admin-эндпоинт/разрешение или убрать страницу из web-admin.

### BUG-2.10. Оборудование чужого зала в тренировке/шаблоне

- `backend/src/workouts/workouts.service.ts:493-499` — `gymEquipment.count({ where: { id: { in: equipmentIds } } })` без `gymId`.
- `assertItems` (`:471`) не принимает `gymId`; вызывается из `createTemplate:124`, `updateTemplate:148`, `createWorkout:189`, `updateWorkout:229`.

Сценарий: тренер зала A указывает оборудование зала B.

Исправление: `count({ where: { id: { in: equipmentIds }, gymId } })`.

### BUG-2.11. Обход проверки TrainerGym

- `backend/src/workouts/workouts.service.ts:435-447`: `trainerGym.count({ where: { trainerId } })` без `isActive`; при `0` проверка пропускается целиком.

Сценарий: тренер без записей `TrainerGym` создаёт тренировку в любом зале при наличии `ClientTrainer`. E2E `workouts.e2e-spec.ts:188-227` создаёт связь без `TrainerGym`.

Исправление: всегда `findFirst({ trainerId, gymId, isActive: true })`.

### BUG-2.12. PostgreSQL и Redis опубликованы наружу

- `docker-compose.yml:10-11` — `5432:5432`.
- `docker-compose.yml:20-21` — `6379:6379`, Redis без пароля.
- Пароль БД совпадает с примером (см. BUG-2.1).

Исправление: убрать `ports` (только internal network) или `127.0.0.1:5432`, `requirepass` для Redis, уникальный пароль.

### BUG-2.13. WebSocket-чат без валидации и лимитов

- `backend/src/chats/chat.gateway.ts:27` — `cors: { origin: '*' }`.
- `:110-130` — `chat:send` передаёт `{text: body.text}` напрямую в сервис, минуя `SendMessageDto`.
- `backend/src/chats/dto/message.dto.ts:13-18` — `text` только `MinLength(1)`, без `MaxLength`.
- `:132-145` — токен принимается из query string.
- Rate limit отсутствует.

Сценарий: флуд и запись сообщений до ~1 МБ, DoS/раздувание БД; токен утекает в логи прокси.

Исправление: allowlist origin, валидация WS-payload, `@MaxLength`, throttle, токен только в `handshake.auth`.

---

## P2 — средний риск и качество

### BUG-2.14. Дубли получателей и push-уведомлений

- `backend/src/notifications/notifications.service.ts:42-71` — `clientTrainer.findMany({ gymId, isActive: true })` без `distinct`.
- У `NotificationRecipient` нет `@@unique([notificationId, userId])`.
- `backend/src/auth/auth.service.ts:141-149` — `updatePushToken` не проверяет уникальность FCM-токена между пользователями.

Следствие: у клиента с двумя тренерами в зале — 2 получателя, 2 push, задвоенный unread; push может уйти не тому.

Исправление: `distinct`/дедуп по `client.userId`, unique-индексы, проверка уникальности push-токена.

### BUG-2.15. Каскады дают 500 вместо 409

- `backend/src/gyms/gyms.service.ts:39-51` — проверяется только `equipmentCount`, затем hard `gym.delete`.
- `backend/src/equipment/equipment.service.ts:63-67` — нет проверки ссылок из `WorkoutItem`/`WorkoutTemplateItem`.
- `backend/src/exercises/exercises.service.ts:45-49` — аналогично.

Исправление: проверять все ссылки и отдавать `ConflictException` либо использовать soft-delete.

### BUG-2.16. Чат: unread не сбрасывается, доступ не отзывается

- `backend/src/chats/chats.service.ts:59-93` — `Message.readAt` нигде не обновляется, mark-read отсутствует.
- Членство привязано к `Chat.clientId/trainerId` навсегда: после деактивации `ClientTrainer` тренер сохраняет чтение/отправку.

Исправление: эндпоинт mark-read; при деактивации связи блокировать отправку (историю оставить read-only).

### BUG-2.17. HTTP-безопасность и upload

- `backend/src/main.ts` — нет `helmet()`, `enableCors`, `forbidNonWhitelisted`.
- `backend/src/main.ts:18-25` — Swagger доступен в проде без авторизации.
- `backend/src/upload/upload.controller.ts:46-58` — проверка только `file.mimetype` и расширения, без magic bytes.
- `backend/src/app.module.ts:53-56` — `/uploads` раздаётся без авторизации.

Исправление: `helmet`, CORS allowlist, Swagger только вне prod, проверка сигнатуры (`file-type`), `nosniff`, отдача через контроллер/подписанные URL.

### BUG-2.18. Ослабленная валидация и криптография

- `backend/src/main.ts:11-16` — нет `forbidNonWhitelisted`.
- Нет `@MaxLength` на `name/comment/title/body/description/phone`.
- `backend/src/equipment/dto/create-equipment.dto.ts:14-22` — отрицательные `minWeight/maxWeight` (нет `@Min(0)`).
- `backend/src/auth/auth.service.ts:18` — `BCRYPT_ROUNDS = 10`.
- `auth.service.ts:64-105` — refresh rotation без reuse-detection и с гонкой.
- `auth.service.ts:43-59` — enumeration по времени (bcrypt не вызывается для несуществующего телефона).
- `auth.service.ts:168` — bcrypt хеширует refresh-JWT, но учитывает только первые 72 байта.
- `jwt.strategy.ts`, `jwt-refresh.strategy.ts`, `chat.gateway.ts:59-61` — алгоритм JWT не зафиксирован.

Исправление: `forbidNonWhitelisted`, `@MaxLength`, `@Min(0)`, bcrypt 12+, HMAC-SHA256 для refresh, reuse-detection, фиктивный хеш для enumeration, `algorithms: ['HS256']`.

### BUG-2.19. Mobile не реализует мультизальность

- Нет вызовов `GET /trainer/gyms`, `GET /client/gyms`, `GET /client/gyms/:gymId/trainers`, `POST .../link`, `GET/DELETE /client/trainers` (grep пуст).
- `mobile/lib/features/clients/clients_api.dart:9-15` — `GET /trainer/clients` без `gym_id` (требование 7.2).
- `mobile/lib/features/workouts/workouts_api.dart:10-15` — тренер выбирает зал из `GET /gyms` вместо `GET /trainer/gyms` (7.3).
- `mobile/lib/features/client/client_workouts_api.dart:9-21` — календарь без `gym_id` (8.4).
- `mobile/lib/features/clients/trainer_client.dart:18-34` — модель игнорирует `photoUrl`, `gyms`, `active_trainers`, `assignedBy` (7.4/8.3).
- `mobile/lib/core/push/push_service.dart:28-41` — push инициализируется только у клиента.

Исправление: реализовать экраны/провайдеры на существующие эндпоинты, добавить поля моделей, фильтры и push для тренера.

### BUG-2.20. Функциональные заглушки и ошибки UI

- `web-admin/src/pages/Dashboard.tsx:3-13` — заглушка на главной.
- `web-admin/src/router.tsx:72-75` — маршрут-заглушка `/protected/equipment`.
- `web-admin/src/pages/Gyms/index.tsx:148-169` — нет перехода к оборудованию, маршрут `gyms/:id/equipment` недостижим из UI.
- `web-admin/src/pages/Clients/index.tsx:139-191`, `Exercises/index.tsx:90-115`, `Equipment/index.tsx:100-128` — очищенные опциональные поля не отправляются (`undefined`), нельзя стереть значение.
- `web-admin/src/pages/Clients/index.tsx:105-111`, `Gyms/index.tsx:38-44`, `Equipment/index.tsx:73-82`, `Exercises/index.tsx:65-77`, `FoodProducts/index.tsx:40-46`, `ClientWeight/index.tsx:52-61` — игнорируется `isError`, нет retry/empty state.
- `web-admin/src/pages/Chats/index.tsx:65-76,169-172` — нет loading/error, `attachmentUrl` не отображается.
- `mobile/lib/features/clients/client_card_screen.dart:57-99` — вкладка «Тренировки» не показывает существующие тренировки.
- `mobile/lib/features/workouts/workouts_providers.dart:28-37` — список тренировок тренера не читается; режим редактирования (`WorkoutBuilderScreen.workout`) мёртв.
- `web-admin/src/pages/Clients/index.tsx:512-533` — тренер выбирается без привязки к залу; backend молча создаёт `TrainerGym`.

### BUG-2.21. Дублирование и уникальность кода

- web-admin: 7 CRUD-страниц с одинаковым boilerplate (форма/модалка/мутации/invalidate) — кандидат на `useCrudModal`.
- web-admin: дубли `GENDER_OPTIONS`/`GENDER_LABELS` (`Clients/index.tsx:26-36`), `TYPE_OPTIONS`/`TYPE_LABELS` (`Equipment/index.tsx:46-58`, `Exercises/index.tsx:40-52`).
- web-admin: списки таймзон расходятся — 13 в `Settings/index.tsx:11-25` и 30 в `mobile/lib/features/settings/settings_screen.dart:9-39`.
- mobile: 5 копий форматирования чисел (`trainer_client.dart:71`, `client_workout_models.dart:182`, `nutrition_models.dart:128`, `progress_tab.dart:313`, `exercise_progress_screen.dart:155`).
- mobile: 4 хелпера даты `YYYY-MM-DD` (`client_workouts_api.dart:40`, `nutrition_api.dart:42`, `nutrition_models.dart:139`, `client_calendar_tab.dart:229`).
- mobile: дубли виджетов `_ErrorBox`, `_LegendItem`, `_ExerciseTile`, `_SectionTitle`.
- mobile: мёртвый код `ClientWorkoutEquipment` (`client_workout_models.dart:24-36`).
- DB: нет `@@unique([notificationId, userId])`, `User.pushToken` не уникален.

---

## Что проверено и корректно

- Prisma ORM, `$queryRaw`/`$executeRaw`/`Unsafe` отсутствуют — SQL-инъекций нет.
- IDOR в основных чтениях закрыт: workouts, chats (HTTP и WS), nutrition, weight-measurements, reports, gym-links, trainer-clients.
- `@Public()` только на health/login/refresh; refresh защищён `AuthGuard('jwt-refresh')`.
- Admin-роуты под `@Roles(ADMIN)`.
- Нет `dangerouslySetInnerHTML`/`innerHTML`; upload использует UUID-имена.
- `markRead` уведомлений ограничен `userId + notificationId`.
- Логирование паролей/токенов отсутствует; стектрейсы скрыты при `NODE_ENV=production`.

## Проверки

- `cd backend && npx tsc --noEmit -p tsconfig.json` — 2 ошибки (BUG-2.2).
- Сравнение `.env` и `.env.example` по SHA-256 — 5 совпадений (BUG-2.1).
- `docker-compose.yml` — порты `5432`, `6379` опубликованы (BUG-2.12).
- E2E/сборки после исправлений не перезапускались (исправлений ещё не было).

## Связанные документы

- `docs/plan1.md` — план исправлений (раздел 3.5).
- `docs/new2.md` — журнал этого аудита.
- `docs/test1.md` — текущее покрытие тестами.

## Снято с учёта (2026-11-12)

- BUG-2.12: PostgreSQL и Redis опубликованы только на `127.0.0.1`, Redis с `requirepass` — закрыт в `docker-compose.yml`.
- BUG-2.21: `useCrudModal` используется во всех 7 CRUD-страницах `web-admin/src/pages/` — закрыт.
