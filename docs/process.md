# Process — Gym App

Дата фиксации: 2026-11-08
Источники: `tehzadanie.md`, `docs/er.md`, `docs/api.md`, план работ (промпты 1.1–1.19 и спринты 2–4).

Легенда статуса:
- `[x]` — сделано и проверено по коду/файлам
- `[~]` — сделано частично
- `[ ]` — не сделано

---

## 1. Итоговая картина

- Backend: Sprint 1 закрыт. Готовы schema, Prisma, seed, auth, gyms, equipment, upload, exercises, food-products, clients, trainers, client-trainers, weight-measurements, reports и shared `GET /gyms`. `nest build` и typecheck (включая e2e) проходят.
- Web-admin: каркас, логин, layout, Gyms, Equipment, Exercises, FoodProducts, Clients, Trainers, ClientWeight готовы; страницы Clients/Trainers/ClientWeight приведены к моделям.
- Backend Спринтов 2–4 реализован: тренировки/шаблоны, результаты, питание, `GET /trainer/clients`, уведомления, FCM push, чат + WebSocket. Flutter-клиент не создан. e2e новых модулей не написаны.
- В git нет ни одного коммита; `.gitignore` в рабочем дереве удалён.
- e2e новых модулей написаны, но не прогнаны: локально не поднята БД, `make test` не запускался.

---

## 2. Что сделано

### 2.1. Backend init / Prisma / seed

- `[x] backend/prisma/schema.prisma` — все модели из `docs/er.md`:
  - все `DateTime` → `@db.Timestamptz`, `Workout.date` → `@db.Date`, `Client.birthdate` → `@db.Date`;
  - enum `Role`, `GymEquipmentType`, `ExerciseType`, `Gender`, `WorkoutStatus`, `NutritionType`, `ChatType`;
  - relations, unique (`User.phone`, `Client.userId`, `Trainer.userId`, `WorkoutItemResult.itemId`), индексы (`ClientTrainer(gymId,isActive)`, `WeightMeasurement(clientId, measuredAt DESC)`, `Workout(clientId,date)`, `Workout(trainerId,date)`, `Message(chatId,createdAt)`, `NotificationRecipient(userId,readAt)`);
  - `WeightMeasurement.measurer` ↔ `User.measurements` через relation `"Measurer"`;
  - datasource `postgresql`, `env("DATABASE_URL")`.
- `[x] backend/prisma/migrations/20261108121212_init/` — начальная миграция создана.
- `[x] backend/src/prisma/prisma.service.ts`, `prisma.module.ts` — `@Global()`.
- `[x]` `PrismaModule` зарегистрирован в `backend/src/app.module.ts`.
- `[x] backend/prisma/seed.ts` — идемпотентный upsert админа: `ADMIN_PHONE`, `ADMIN_PASSWORD`, `DEFAULT_TIMEZONE`, bcrypt(10), role ADMIN, name «Администратор».

### 2.2. Инфраструктура

- `[x] docker-compose.yml` — postgres:16-alpine (healthcheck `pg_isready`), redis:7-alpine, backend, web-admin (nginx, порт 3000).
- `[x] Makefile` — `up`, `down`, `migrate`, `seed`, `logs`, `test`, `psql`.
- `[x] .env.example`, `README.md`.
- `[x] backend/Dockerfile`, `web-admin/Dockerfile`, `web-admin/nginx.conf` (proxy `/api`, `/uploads`, `try_files`).
- `[x] backend/src/main.ts` — глобальный префикс `api/v1`, `ValidationPipe({whitelist, transform})`, Swagger `/api/docs`.
- `[x] backend/src/health/health.controller.ts` — `GET /api/v1/health` (`@Public`).

### 2.3. Auth (промпты 1.5–1.6)

- `[x] POST /auth/login` — bcrypt, access 15m, refresh 30d, hash refresh в `RefreshToken`, ответ `{access_token, refresh_token, role, user_id}`, 401 на неверные креды.
- `[x] POST /auth/refresh` — проверка hash в БД + rotation (удаление старого, выдача нового), 401 иначе.
- `[x] GET /auth/me` — `{user_id, role, name, phone, timezone}`.
- `[x] PATCH /auth/timezone` — валидация `Intl.supportedValuesOf('timeZone')`, 400/204.
- `[x]` стратегии `jwt`, `jwt-refresh`; глобальные `JwtAuthGuard` + `RolesGuard`; `@Public()`, `@Roles()`.
- `[x] backend/src/auth/auth.e2e-spec.ts` — 8 сценариев из плана (login ok/пароль/телефон, me без/с токеном, rotation, timezone Moscow/Invalid).

### 2.4. Справочники, реализованные на backend

- `[x] Gyms (1.7)` — `backend/src/gyms/`: `GET/POST /admin/gyms`, `GET/PUT/DELETE /admin/gyms/:id`; `DELETE` → 409 при наличии `GymEquipment`; `gyms.e2e-spec.ts` (401 без токена, 403 тренер, CRUD, 404, 409).
- `[x] Equipment + Upload (1.8)`:
  - `backend/src/equipment/`: `GET/POST /admin/gyms/:gymId/equipment`, `PUT/DELETE /admin/equipment/:id`, `GET /gyms/:gymId/equipment` (любая роль);
  - валидация `minWeight <= maxWeight`, enum типа;
  - `backend/src/upload/upload.controller.ts`: `POST /admin/upload`, jpg/jpeg/png/webp, 5 MB, `./uploads/{uuid}.{ext}` → `{url:"/uploads/uuid.ext"}`;
  - `equipment.e2e-spec.ts` — все сценарии из плана.

### 2.5. Backend Sprint 1 — модули (1.9–1.13)

- `[x] 1.9 Exercises` — `backend/src/exercises/`: DTO (`create/update/filter`), `GET/POST /admin/exercises`, `PUT/DELETE /admin/exercises/:id`, shared `GET /exercises?type=&muscle_group=&q=` (q — `contains` insensitive); `exercises.e2e-spec.ts`.
- `[x] 1.10 FoodProducts` — `backend/src/food-products/`: DTO с `@Min(0)` для kcal/protein/fat/carbs, admin CRUD; `food-products.e2e-spec.ts`.
- `[x] 1.11 Clients + Trainers + Links`:
  - `backend/src/clients/` — admin CRUD, транзакция User+Client, 409 на занятый phone, `initial_password` (из `DEFAULT_CLIENT_PASSWORD`), список с `age`, `currentWeight`, `currentFatMass`, `active_trainers` (`trainerName`, `gymName`);
  - `backend/src/trainers/` — admin CRUD, role TRAINER, `initial_password`;
  - `backend/src/client-trainers/` — `POST /admin/clients/:id/trainers`, `DELETE /admin/clients/:id/trainers/:linkId` (soft delete), 409 на дубль активной связи;
  - `clients/client-trainers.e2e-spec.ts`.
- `[x] 1.12 Weight measurements` — `backend/src/weight-measurements/`: `GET/POST /client/:id/weight-measurements`, `@Roles(TRAINER)`, проверка активной связи (404 клиент / 403 связь), `measuredBy=userId` из JWT; `weight-measurements.e2e-spec.ts`.
- `[x] 1.13 Reports` — `backend/src/reports/`: `weight-dynamics`, `exercise-progress` (fallback план→факт, `isActualFallback`), `exercises-summary` (`firstWeight/lastWeight/recordsCount`), `resolveClientId` для CLIENT/TRAINER/ADMIN; `reports.e2e-spec.ts`.
- `[x]` Shared `GET /gyms` — `SharedGymsController` в `backend/src/gyms/gyms.controller.ts`.
- `[x]` Web-страницы: `ClientWeight`, поля профиля клиента и кнопка «Вес», Trainers по модели уже были реализованы; `web-admin/src/pages/Clients/index.tsx` приведён к ответу API (`trainerName`/`gymName`).

### 2.6. Web-admin

- `[x] 1.14 каркас`: Vite + React + TS, antd, router, axios, react-query, zustand; `src/api/client.ts` (Bearer, refresh на 401), `src/store/auth.ts`, `router.tsx`, `Login.tsx`, `MainLayout.tsx` (Sider + Header с именем/TZ/выходом), `Dashboard` заглушка, proxy `/api` и `/uploads`.
- `[x] 1.15 Gyms`: таблица + модалка create/edit/delete, invalidate, обработка ошибок.
- `[x] 1.16 Equipment`: таблица по залу, модалка, Upload → `/admin/upload`, `photoUrl`.
- `[~] 1.17 Exercises`: страница есть, фильтры type/muscleGroup/q и CRUD-модалка есть; enum приведён к ER (`EQUIPMENT/FREE_WEIGHT/BODYWEIGHT/CARDIO`); backend-модуля нет.
- `[~] 1.18 FoodProducts`: страница есть (таблица + CRUD, InputNumber min=0), backend-модуля нет.
- `[x] 1.19 Clients/Trainers`:
  - `Clients`: таблица ФИО/телефон/пол/дата рождения/возраст/вес/жир/цель/тренеры; модалка phone/name/gender/height/birthdate/startWeight/startFatMass/goal/notes; Drawer «Тренеры»; кнопка «Вес»;
  - `Trainers`: таблица + CRUD-модалка только phone/name (birthdate/goal/notes убраны);
  - `ClientWeight` (`/protected/clients/:id/weight`): список замеров + модалка добавления (weight/fatMass/measuredAt/comment).

---

## 3. Что осталось сделать

### 3.1. Backend Sprint 1 — закрыт

- `[x] 1.9 Exercises` — `backend/src/exercises/`: DTO, `GET/POST /admin/exercises`, `PUT/DELETE /admin/exercises/:id`, `GET /exercises?type=&muscle_group=&q=` (q — Prisma `contains` insensitive), `exercises.e2e-spec.ts`.
- `[x] 1.10 FoodProducts` — `backend/src/food-products/`: DTO (kcal/protein/fat/carbs `@Min(0)`), admin CRUD, `food-products.e2e-spec.ts`.
- `[x] 1.11 Clients + Trainers + Links`:
  - `backend/src/clients/` — `POST/GET/PUT/DELETE /admin/clients`; транзакция User + Client; 409 на занятый phone; ответ с `initial_password`; список с `active_trainers`, `age`, `currentWeight`, `currentFatMass`;
  - `backend/src/trainers/` — admin CRUD, role TRAINER, `initial_password`;
  - `backend/src/client-trainers/` — `POST /admin/clients/:id/trainers`, `DELETE /admin/clients/:id/trainers/:linkId` (soft delete `isActive=false`), 409 на дубль активной связи;
  - `clients/client-trainers.e2e-spec.ts`.
- `[x] 1.12 Weight measurements` — `backend/src/weight-measurements/`: `GET/POST /client/:id/weight-measurements` (`@Roles(TRAINER)`, проверка активной связи, 404/403), `measuredBy=userId` из JWT, `weight-measurements.e2e-spec.ts`.
- `[x] 1.13 Reports` — `backend/src/reports/`: `weight-dynamics`, `exercise-progress` (fallback план→факт, `isActualFallback`), `exercises-summary` (firstWeight/lastWeight/recordsCount), resolveClientId для CLIENT/TRAINER/ADMIN, `reports.e2e-spec.ts`.
- `[x]` Shared `GET /gyms` — `SharedGymsController` в `backend/src/gyms/gyms.controller.ts`.
- `[x]` Догоняющие web-страницы: `ClientWeight`, поля профиля клиента (gender, height, startWeight, startFatMass, age, currentWeight, currentFatMass), кнопка «Вес», Trainers по модели; ответ Clients приведён к API (`trainerName`/`gymName`).
- `[~]` e2e всех новых модулей написаны и типизируются, но не прогнаны: БД локально не поднята.

### 3.2. Backend Sprint 2–4 (из ТЗ)

- `[x]` Тренировки: `backend/src/workouts/` — `WorkoutTemplate`/`WorkoutTemplateItem` CRUD (`GET/POST/PUT/DELETE /trainer/templates`), `POST/PUT /trainer/workouts`, `GET /client/workouts?from=&to=`, `GET /client/workouts/:id`; DTO, проверки активной связи тренер-клиент, зала, упражнений и оборудования.
- `[x]` Выполнение: `PUT /client/workout-items/:id/result` (upsert `WorkoutItemResult`, `done`/`actualWeight`/`actualReps`/`clientComment`); fallback план→факт используется в `reports/exercise-progress`.
- `[x]` Питание: `POST /trainer/nutrition`, `GET /client/nutrition?date=` (`backend/src/nutrition/`), проверка связи, фильтр по `validFrom`/`validTo`.
- `[x]` `GET /trainer/clients` — `backend/src/trainer-clients/`, активные связи, `age`/`currentWeight`/`currentFatMass`/`active_trainers`.
- `[x]` Уведомления: `POST /admin/notifications` (broadcast по `gym_id` или всем клиентам), `GET /notifications`, `POST /notifications/:id/read` (`backend/src/notifications/`).
- `[x]` Чат: `GET /chats`, `GET/POST /chats/:id/messages`, WebSocket namespace `/chat` (`chat:join`/`chat:leave`/`chat:send`, событие `chat:message`), один инстанс без Redis pub/sub (`backend/src/chats/`).
- `[~]` FCM push: `backend/src/notifications/push.service.ts` (firebase-admin, батчи по 500, очистка stale-токенов); `FCM_CREDENTIALS_JSON` добавлена в `.env.example` и `docker-compose.yml`. Реальная отправка с боевыми кредами не проверялась.
- `[ ]` Mobile Flutter (тренер + клиент) — папка `mobile/` отсутствует; по правилам проекта пока не создаётся.

### 3.3. Тесты и проверки

- `[x]` e2e: auth, gyms, equipment.
- `[x]` e2e: exercises, food-products, clients-trainers, weight-measurements, reports — прогнаны, проходят.
- `[x]` `nest build` (backend) и `pnpm build` (web-admin) проходят; typecheck e2e-спеков проходит.
- `[x]` Полный прогон e2e: 8 наборов, 61 тест — все проходят (`pnpm test:e2e`, `--runInBand`, т.к. наборы делят одну БД).
- `[x]` `make test` починен: `Makefile` → `pnpm test:e2e`; в runtime-образ копируются `src` и `jest.config.js`; `test:e2e` запускается последовательно.
- `[x]` Смоук `make up && make migrate && make seed` + `curl /health` + Swagger: `GET /api/v1/health` → 200 `{"status":"ok"}`, `/api/docs` → 200, `/api/docs-json` → 200.

---
4. План действий по разделу 4.1 ТЗ — Администратор (web)
4.1. Финальная сверка с требованиями 4.1
[x] 4.1.1. Сверка страниц с п. 4.1 ТЗ.

Результат сверки `web-admin`:
- `[x]` Trainers — CRUD, `initial_password` в ответе.
- `[x]` Clients — CRUD, все поля профиля, назначение/отвязка тренера, переход к замерам.
- `[x]` Gyms — CRUD, удаление с обработкой 409 (зал с тренажёрами).
- `[x]` Equipment — CRUD, удаление, enum `MACHINE`/`FREE_WEIGHT`/`CARDIO`/`OTHER`, проверка min≤max.
- `[x]` Exercises — CRUD, фильтры type/muscleGroup/q.
- `[x]` FoodProducts — CRUD, валидация нутриентов (`min=0`).
- `[x]` Загрузка фото — jpg/png/webp ≤5 МБ через `/admin/upload`.
- `[x]` Notifications — форма рассылки (title, body, опц. gym_id).
- `[x]` Chats — список чатов, лента сообщений, отправка, автообновление.
- `[x]` Clients edit — `startWeight`/`startFatMass` disabled при редактировании (S6).
- `[x]` Settings TZ — страница и пункт меню, `PATCH /auth/timezone` (S12).

Исправления внесены; `pnpm build` и `oxlint` проходят. Ручной UI-smoke — см. 4.2.2.

Пройти по списку: CRUD тренеров, клиентов (со всеми полями профиля), залов, тренажёров (min/max, фото), упражнений, продуктов питания; назначение связей клиент↔тренер↔зал; деактивация связи; загрузка фото (jpg/png/webp ≤5 МБ); рассылка уведомлений (с gym_id / без); чаты 1:1 (клиент, тренер).

Промпт OpenCode (новый чат на каждую страницу-расхождение):

text
Проверь web-admin/src/pages/<Page>/ на соответствие п. 4.1 ТЗ:
<перечислить требования из ТЗ>
Если чего-то нет — добавь. Не трогай другие страницы.
Проверка в браузере по чек-листу UI-smoke (см. п. 4.2.2).

Коммит: fix(web): <page> aligned with spec 4.1.

4.2. Тесты раздела 4.1
[x] 4.2.1. Backend e2e по admin-эндпоинтам (уже прогнаны в 3.3, отметить как покрытые) — перепрогнаны 2026-11-09: 8 наборов, 61 тест, все PASS (`pnpm test:e2e`):

auth.e2e-spec, gyms.e2e-spec, equipment.e2e-spec, exercises.e2e-spec, food-products.e2e-spec, clients-trainers.e2e-spec.

Если после 4.1.1 что-то менялось — перепрогнать эти спеки.

[x] 4.2.2. UI-smoke web-admin — проверено 2026-11-09 через API + код-ревью (браузера на сервере нет; ручной браузерный прогон остаётся за человеком).

[x] S1. Auth: логин 200, неверный пароль 401; logout и сохранение сессии — код `store/auth.ts` (zustand `persist`, ключ `gym-auth`, `logout()` чистит токены/юзера).

[x] S2. Gyms: create/read/update 201/200/200, удаление пустого зала 204; удаление зала с тренажёром → 409 (`Gym has equipment and cannot be deleted`).

[x] S3. Equipment: upload 201 (`/uploads/*.png`), создание с `photoUrl` 201, `minWeight>maxWeight` → 400, удаление 204.

[x] S4. Exercises: созданы все 4 типа (EQUIPMENT/FREE_WEIGHT/BODYWEIGHT/CARDIO) → 201; GET `/exercises` фильтры `type`/`muscle_group`/`q` возвращают корректные выборки (1/4/1).

[x] S5. FoodProducts: `kcal=-1` → 400 (`kcal must not be less than 0`), `kcal=100` → 201, удаление 204.

[x] S6. Clients: создание со всеми полями → 201, `age=36`, `initial_password` в ответе; `Modal.success` — `web-admin/src/pages/Clients/index.tsx:156`; `startWeight`/`startFatMass` disabled при edit — строки 426/435; `currentWeight` в списке обновился.

[x] S7. Trainers: создание → 201 + `initial_password`; `Modal.success` — `web-admin/src/pages/Trainers/index.tsx:63`.

[x] S8. Links: назначение 201 (`isActive=true`), отвязка 204 (`isActive=false` в БД), повторное назначение 201; активных связей в зале — 1.

[x] S9. ClientWeight: тренер добавил замер 201; в списке клиентов `currentWeight=78.5`, `currentFatMass=19`.

[x] S10. Notifications: с `gym_id` → `NotificationRecipient` ровно 1 (клиент с активной связью в этом зале); без `gym_id` → все клиенты (3).

[x] S11. Chats: сообщение админа 201, видно клиенту (второй токен/«окно»), в БД 1 `Message`.

[x] S12. Settings: PATCH TZ 204 → `/auth/me` Europe/Moscow, после повторного логина сохранилось; возвращено Asia/Novosibirsk.

[x] 4.2.3. Приёмочные сценарии для 4.1 — проверено 2026-11-09 через API:

[x] P2. Цепочка админа пройдена: gym 201 → upload фото 201 → equipment 201 → exercise 201 → food-product 201 → trainer 201 → client (gender/height/birthdate/startWeight/startFatMass/goal/notes) 201 → link 201.

[x] P8. Broadcast: уведомление с `gym_id` зала 1 → 1 получатель (клиент с активной связью в этом зале); клиент, привязанный к другому залу, исключён.

5. План действий по разделу 4.2 ТЗ — Тренер (mobile, Flutter)
Все задачи — Sprint 3 по плану работ ТЗ.

[x] 5.1. Инициализация mobile/.

Новый чат OpenCode.

Промпт: flutter create mobile --org com.gymapp --platforms=android. В pubspec.yaml: dio, flutter_secure_storage, flutter_riverpod, fl_chart, socket_io_client, intl, firebase_core, firebase_messaging. lib/core/api/dio_client.dart: baseUrl из --dart-define=API_URL, interceptor Bearer + refresh на 401. lib/core/storage/secure_storage.dart для access/refresh.

Проверка: cd mobile && flutter pub get && flutter analyze без ошибок, flutter run на эмуляторе Android — пустой экран "Gym Trainer".

Коммит: feat(mobile): init flutter project + api client.

Выполнено: Flutter 3.47.9 / Dart 3.13, Android SDK 36; `flutter analyze` и `flutter test` без ошибок, `flutter build apk --debug` OK. Базовый URL API настраивается в приложении (иконка «Адрес сервера»), `--dart-define=API_URL` — fallback; interceptor Bearer + refresh на 401. Firebase отложен до 6.6 (нет `google-services.json`).

[x] 5.2. Auth (тренер).

Промпт: экран Login (phone/password) → POST /auth/login → сохранить токены → GET /auth/me → перейти на главный. Logout в настройках.

Проверка: вход под тренером (DEFAULT_CLIENT_PASSWORD) → «Мои клиенты».

Коммит: feat(mobile): trainer auth.

Выполнено: экран Login, восстановление сессии через `/auth/me`, refresh токенов на 401, доступ только для роли `TRAINER`, logout в настройках. Проверено API: `POST /auth/login` + `GET /auth/me` для тренеров `+79995550010` и `+73830000000`. UI-проверка на устройстве — за человеком.

[x] 5.3. Мои клиенты.

Промпт: GET /trainer/clients → список (имя, телефон, текущий вес). Тап → карточка клиента с табами: Тренировки / Прогресс / Питание / Вес / Чат.

Проверка: список совпадает с назначенными связями.

Коммит: feat(mobile): trainer clients list.

Выполнено: список с именем, телефоном и текущим весом, pull-to-refresh, карточка клиента с табами Тренировки/Прогресс/Питание/Вес/Чат (табы-заглушки до 5.4–5.9). Проверено API: `GET /trainer/clients` вернул 2 клиента для тренера `+79995550010`. UI-проверка на устройстве — за человеком.

[x] 5.4. Создание тренировки.

Промпт: экран создания. Шаги: клиент → зал (GET /gyms) → шаблон (GET /trainer/templates, опц.) или пустой → чекбоксы упражнений (GET /exercises) → для каждого вес/подходы/повторы → дата (DatePicker) → POST /trainer/workouts. При выборе шаблона — предзаполнить, дать отредактировать.

Проверка: создать тренировку → видна в GET /client/workouts (через psql или web).

Коммит: feat(mobile): workout builder with templates.

Выполнено: экран создания тренировки из карточки клиента (вкладка «Тренировки»): зал из `GET /gyms`, необязательный шаблон из `GET /trainer/templates` с предзаполнением и возможностью правки, чекбоксы упражнений из `GET /exercises`, для каждого вес/подходы/повторы, DatePicker, комментарий, `POST /trainer/workouts`. Проверено: `flutter analyze` без замечаний, APK собран; API принимает запрос с ролью TRAINER и валидирует поля (400 на пустое тело, 404 на несуществующего клиента — без вставки). Сквозное создание и просмотр в `GET /client/workouts` — в 5.12/на устройстве.

[x] 5.5. Шаблоны.

Промпт: GET/POST/PUT/DELETE /trainer/templates. Список, создание (как в 5.4), редактирование, удаление.

Проверка: создать → использовать в 5.4 → отредактировать → удалить.

Коммит: feat(mobile): workout templates CRUD.

Выполнено: экран «Шаблоны тренировок» из панели «Мои клиенты»: список, создание/редактирование (название, описание, упражнения с весом/подходами/повторами), удаление с подтверждением. API проверено полным циклом create → rename/update → list → delete (204, список очищен). `flutter analyze` без замечаний, APK собран.

[x] 5.6. Замеры веса.

Промпт: таб «Вес» в карточке клиента: GET /client/{id}/weight-measurements + кнопка «Добавить замер» → POST (weight, fatMass, measuredAt, comment). Карточка сверху «Старт X → Сейчас Y (Δ)».

Проверка: добавить замер → currentWeight обновился в 5.3.

Коммит: feat(mobile): trainer weight measurements.

Выполнено: таб «Вес» в карточке клиента — история замеров, карточка «Старт X → Сейчас Y (Δ)», диалог добавления (вес, жир %, дата, комментарий) → `POST /client/{id}/weight-measurements`. После добавления обновляются замеры и `GET /trainer/clients`. Проверено API: временный замер 77,7 кг поднял `currentWeight` с 78,5 до 77,7, после удаления тестовой строки через psql вернулось 78,5. `flutter analyze` без замечаний, APK собран.

[x] 5.7. Прогресс клиента.

Промпт: таб «Прогресс». GET /reports/weight-dynamics?client_id= → LineChart двумя линиями. GET /reports/exercises-summary?client_id= → список «начал X → сейчас Y, N записей». Тап → GET /reports/exercise-progress → LineChart план (пунктир) vs факт (сплошная), isActualFallback=true — серый/пустой кружок.

Проверка: графики рисуются, fallback визуально отличается.

Коммит: feat(mobile): trainer progress charts.

Выполнено: таб «Прогресс» — LineChart динамики веса (вес + жир %) по `GET /reports/weight-dynamics`, список упражнений «Начал X → сейчас Y, N записей» по `GET /reports/exercises-summary`, экран упражнения с графиком план (пунктир) / факт (сплошная) по `GET /reports/exercise-progress`; точки `isActualFallback=true` — пустой серый кружок. API проверено на живых данных (1 замер веса, пустая история упражнений). `flutter analyze` без замечаний, тесты проходят, APK собран.

[ ] 5.8. Питание.

Промпт: таб «Питание». Форма: тип (DAILY/POST_WORKOUT), kcal, protein, fat, carbs, comment, validFrom/validTo → POST /trainer/nutrition. Список назначенных рекомендаций.

Проверка: назначить → видно в psql/через клиента (5.13).

Коммит: feat(mobile): trainer nutrition.

[ ] 5.9. Чат (тренер).

Промпт: GET /chats → список (peer, lastMessage, unread). Экран чата: GET /chats/{id}/messages, POST /chats/{id}/messages, WS namespace /chat (chat:join, chat:send, chat:message).

Проверка: отправить из web-admin → приходит в реальном времени.

Коммит: feat(mobile): trainer chat.

[ ] 5.10. Настройки (TZ).

Промпт: экран: TZ Select из Intl.supportedValuesOf('timeZone') → PATCH /auth/timezone. Logout.

Проверка: сменить TZ → перезайти → сохранено.

Коммит: feat(mobile): trainer settings.

[ ] 5.11. Backend: PATCH /auth/push-token.

Промпт: добавить эндпоинт PATCH /auth/push-token (body {token}) → сохранить в User.pushToken. Используется FCM в 5.9, 5.15.

Проверка: curl → pushToken в БД обновился.

Коммит: feat(auth): push token registration.

[ ] 5.12. Тесты раздела 4.2.

[ ] workouts.e2e-spec — POST /trainer/workouts (из шаблона, с нуля, чужая связь → 403, нет exercise → 400), PUT, GET /client/workouts?from=&to=, GET /client/workouts/:id (чужой → 403).

[ ] templates.e2e-spec — CRUD /trainer/templates, чужой тренер → 404/403.

[ ] trainer-clients.e2e-spec — GET /trainer/clients возвращает только клиентов с активной связью, содержит age/currentWeight/currentFatMass.

[ ] M1–M7 (mobile UI-smoke):

[ ] M1. Auth тренером → «Мои клиенты», logout.

[ ] M2. Список клиентов соответствует назначенным в админке.

[ ] M3. Создание тренировки с нуля и из шаблона.

[ ] M4. CRUD шаблона.

[ ] M5. Добавление замера, currentWeight обновился.

[ ] M6. Графики прогресса отрисовываются, fallback отличается.

[ ] M7. Чат: сообщение из web-admin приходит в реальном времени.

6. План действий по разделу 4.3 ТЗ — Клиент (mobile, Flutter)
Все задачи — Sprint 3.

[ ] 6.1. Auth (клиент) + календарь.

Промпт: тот же auth-экран, роль CLIENT. После входа — календарь: GET /client/workouts?from=&to= (текущий месяц), точки на датах с тренировками. Тап → тренировка дня.

Проверка: тренировка из 5.4 видна в календаре.

Коммит: feat(mobile): client calendar.

[ ] 6.2. Тренировка дня.

Промпт: экран WorkoutItem со планом (вес, подходы, повторы). Для каждого — чекбокс «сделал», поля фактического веса/повторов, комментарий → PUT /client/workout-items/{id}/result. Если done=true и actualWeight пусто — оставляем пусто (fallback считается на бэке).

Проверка: отметить → GET /reports/exercise-progress (psql/curl) показывает isActualFallback: false где заполнено, true где нет.

Коммит: feat(mobile): client workout execution.

[ ] 6.3. Питание (клиент).

Промпт: экран: GET /client/nutrition?date= (сегодня). Список с типом, КБЖУ, комментарием, периодом. DatePicker для других дат.

Проверка: рекомендация из 5.8 видна клиенту.

Коммит: feat(mobile): client nutrition.

[ ] 6.4. Отчёты с графиками (клиент).

Промпт: экран «Отчёты» с табами Вес и Упражнения.

Вес: GET /reports/weight-dynamics → LineChart weight + fatMass (две оси).

Упражнения: GET /reports/exercises-summary → список, тап → GET /reports/exercise-progress → LineChart план (пунктир) vs факт (сплошная), isActualFallback=true — серый/пустой кружок.

Проверка: графики совпадают с данными тренера (5.7).

Коммит: feat(mobile): client reports with charts.

[ ] 6.5. Чат (клиент).

Промпт: GET /chats → два чата (тренер, админ). Экран чата с WS, как в 5.9.

Проверка: сообщение от тренера приходит в реальном времени.

Коммит: feat(mobile): client chat.

[ ] 6.6. Уведомления (клиент).

Промпт: GET /notifications → список, POST /notifications/{id}/read, значок непрочитанных. FCM: firebase_messaging, onMessage/onBackgroundMessage, регистрация токена через PATCH /auth/push-token (см. 5.11).

Проверка: админ отправил broadcast с gym_id → клиент с активной связью видит уведомление.

Коммит: feat(mobile): client notifications + fcm.

[ ] 6.7. Настройки (TZ, клиент).

Промпт: как 5.10, но для клиента.

Коммит: feat(mobile): client settings.

[ ] 6.8. Тесты раздела 4.3.

[ ] workout-results.e2e-spec — PUT /client/workout-items/:id/result upsert (повторный PUT обновляет), чужой item → 403, done=true без actualWeight допустимо.

[ ] nutrition.e2e-spec — POST /trainer/nutrition со связью 201, без связи 403; GET /client/nutrition?date= фильтр validFrom/validTo, чужая рекомендация не видна.

[ ] notifications.e2e-spec — POST /admin/notifications с gym_id создаёт NotificationRecipient только у клиентов с активной связью в этом зале; без gym_id — всем; GET /notifications — только свои; POST /notifications/:id/read идемпотентен.

[ ] M8–M14 (mobile UI-smoke клиента):

[ ] M8. Календарь показывает тренировку из 5.4.

[ ] M9. Отметка done с фактическим весом.

[ ] M10. Питание от тренера видно.

[ ] M11. Графики отчётов отрисовываются.

[ ] M12. Чат: сообщение от тренера приходит в реальном времени.

[ ] M13. Уведомление от админа видно и отмечается прочитанным.

[ ] M14. Смена TZ сохраняется.

7. План действий по разделу 5 ТЗ — Нефункциональные требования
[x] 7.1. Backend NestJS + Prisma + PostgreSQL + Redis. Реализовано.

[x] 7.2. Web-admin React + Vite + AntD. Реализовано.

[ ] 7.3. Mobile Flutter Android. Закрывается через 5.1–5.10 и 6.1–6.7.

[x] 7.4. JWT access 15m / refresh 30d / rotation. Реализовано и прогнано e2e (3.3).

[~] 7.5. WebSocket чата, один инстанс без Redis pub/sub.

[ ] Интеграционный тест:

Промпт: Напиши chat-ws.e2e-spec: два клиента (socket.io-client) подключаются к namespace /chat, chat:join на общий chatId, chat:send от тренера → chat:message у клиента. chat:leave → событие не приходит. Чужой chatId → отказ.

Проверка: docker compose exec backend pnpm test -- chat-ws.e2e-spec зелёный.

Коммит: test(chat): websocket integration.

[ ] Боевая проверка: web-admin ↔ mobile (тренер/клиент) отправляют сообщения, доходят в реальном времени.

[~] 7.6. FCM push.

[ ] Положить реальный secrets/fcm.json, вернуть volume в docker-compose.yml.

Промпт: Верни volume ./secrets/fcm.json в docker-compose.yml для backend. push.service.ts должен инициализироваться при наличии файла и логировать ошибку при отсутствии, не падая.

[ ] Боевая проверка: POST /admin/notifications с gym_id → устройство с токеном получает push. Лог fcm: sent N.

[ ] notifications-fcm.e2e-spec (мок FCM):

Промпт: Создай notifications-fcm.e2e-spec: мок push.service.sendPush, POST /admin/notifications с gym_id → sendPush вызван только для клиентов целевой группы с pushToken; без pushToken sendPush не вызван, NotificationRecipient создан.

Коммит: test(notifications): fcm dispatch.

[ ] Коммит: feat(notifications): fcm verified.

[x] 7.7. Docker / docker-compose на Ubuntu. Реализовано.

[x] 7.8. Офлайн вне MVP. Не реализуется.

[x] 7.9. Оплата вне MVP. Не реализуется.

8. Сводная последовательность работ
4.1.1 — финальная сверка web-admin, коммиты по страницам.

4.2.1–4.2.3 — перепрогон e2e + UI-smoke + приёмочные P2, P8. Коммит chore: spec 4.1 verified.

5.1–5.10 — Flutter-тренер. После каждого пункта — коммит.

5.11 — backend PATCH /auth/push-token. Коммит.

5.12 — тесты тренера (workouts, templates, trainer-clients, M1–M7). Коммит test: spec 4.2 mobile green.

6.1–6.7 — Flutter-клиент. После каждого — коммит.

6.8 — тесты клиента (workout-results, nutrition, notifications, M8–M14). Коммит test: spec 4.3 mobile green.

7.5 — WS-тест + боевая проверка. Коммит.

7.6 — FCM-тест + боевая проверка. Коммит.

Тег sprint-3 после 6.8, sprint-4 после 7.6.

9. Риски и замечания
5.1 Flutter SDK — нужен flutter (stable) на сервере разработки или локально на машине с эмулятором Android. На VPS-без-GUI flutter build apk работает, flutter run — нет; UI-smoke M1–M14 делать на локальной машине с эмулятором или физическом устройстве.

6.6 FCM — без реального secrets/fcm.json push не проверить. Блокирует 6.6 (частично) и 7.6.

5.11 PATCH /auth/push-token — эндпоинта нет в docs/api.md; после реализации обновить спецификацию (docs/api.md) и AGENTS.md при необходимости.

Чат — один инстанс backend по ТЗ. Не масштабировать горизонтально до Sprint 4+.

Timezone — mobile-приложение должно отправлять measuredAt и даты в UTC, отображать в TZ пользователя (GET /auth/me → timezone).

Workout.date — DATE — в мобилке передавать как YYYY-MM-DD без времени, не конвертировать в UTC.

Fallback план→факт — визуализируется только на графиках; в БД WorkoutItemResult.actualWeight может оставаться null при done=true.

Порядок 4.1 → 5 → 6 → 7 — жёсткий: без работающего admin API тренерские и клиентские экраны проверить нечем.


## 4. Найденные расхождения и риски

1. **`make seed`, скорее всего, не работает.** `Makefile` вызывает `npx prisma db seed`, но в `backend/package.json` нет блока `"prisma": {"seed": "..."}`. Нужно добавить `"prisma": { "seed": "ts-node prisma/seed.ts" }` или заменить команду на `pnpm seed`.
2. **`backend/Dockerfile` не генерирует Prisma Client и не кладёт schema/migrations в runtime.** В build-стадии нет `prisma generate`, в runtime нет папки `prisma/` и CLI. Это ломает `pnpm build` (типы `@prisma/client`) и `make migrate` (`prisma migrate deploy` внутри контейнера). Нужно добавить `COPY prisma ./prisma`, `RUN npx prisma generate` на этапе сборки и обеспечить доступность Prisma CLI/schema в runtime (либо отдельная migrate-стадия).
3. **Shared `GET /gyms` добавлен** — `SharedGymsController` в `backend/src/gyms/gyms.controller.ts`, доступен любой авторизованной роли.
4. **Enum упражнений исправлен:** `web-admin/src/pages/Exercises/index.tsx` приведён к ER — `EQUIPMENT | FREE_WEIGHT | BODYWEIGHT | CARDIO`.
5. **Страница Clients дополнена по ТЗ 1.19:** добавлены поля gender/height/startWeight/startFatMass, колонки age/currentWeight/currentFatMass, кнопка «Вес», страница `ClientWeight`.
6. **Страница Trainers приведена к модели:** оставлены только phone/name; birthdate/goal/notes убраны.
7. **Git:** репозиторий `/opt/compose/gym-app/.git` существует, но коммитов нет (`master` без коммитов). `.gitignore` удалён из рабочего дерева — риск закоммитить `node_modules/`, `dist/`, `.env`.
8. **Schema добавляет `createdAt` ряду моделей, где его нет в ER** (GymEquipment, Exercise, FoodProduct, Client, Trainer, WorkoutTemplate). На работу не влияет, но формально это отклонение от «строго по ER».
9. **Redis подключён в compose, но ещё не используется** — задел под спринт 4.
10. **`FCM_CREDENTIALS_JSON` добавлена** в `.env.example` и `docker-compose.yml`; для боевого push нужен реальный JSON сервисного аккаунта.

---

## 5. Рекомендуемый порядок дальнейших шагов

1. Починить инфраструктуру: Prisma generate + schema/migrations в Dockerfile, `prisma.seed` в `package.json`, вернуть `.gitignore`, сделать первый коммит.
2. Backend Sprint 1 закрыт (1.9–1.13 + shared `GET /gyms`) — осталось прогнать e2e на поднятой БД.
3. Привести web-admin в соответствие: исправить enum упражнений, дополнить Clients полями профиля и страницей ClientWeight, упростить Trainers.
4. Прогнать `make down && make up && make test`, смоук через Swagger и браузер.
5. Переходить к Sprint 2 (тренировки/шаблоны/календарь), затем Sprint 3 (питание, Flutter, графики), затем Sprint 4 (чат, FCM).
