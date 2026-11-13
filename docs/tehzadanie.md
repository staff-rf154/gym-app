Техническое задание: Gym App
1. Назначение
Система для управления спортивным залом: администратор (web), тренер (mobile Android), клиент (mobile Android). Учёт тренировок, назначение заданий, питание, взвешивания, отчёты с графиками, чат, уведомления.

2. Роли и доступ
Роль	Интерфейс	Что делает
ADMIN	Web	Видит всё. Создаёт тренеров, клиентов, залы, тренажёры, упражнения, продукты питания. Рассылает и получает уведомления. Ведёт чаты с клиентами и тренерами. Сбрасывает пароли пользователей, добавляет замеры веса.
RECEPTION	Web	Ограничен своим залом: видит и ведёт клиентов, тренеров и связи этого зала (assignedBy=RECEPTION), сбрасывает пароли клиентам и тренерам своего зала, добавляет замеры веса клиентам своего зала, получает уведомления.
TRAINER	Mobile	Видит своих клиентов (активная связь). Создаёт тренировки (шаблон или с нуля), назначает питание, добавляет замеры веса, смотрит прогресс и расхождения, ведёт чат с клиентами, получает уведомления, меняет пароль.
CLIENT	Mobile	Видит календарь тренировок, отмечает выполнение с фактическим весом/повторами, смотрит питание, отчёты с графиками, чат с тренером и админом, уведомления. Может сам выбрать тренера в зале (assignedBy=CLIENT), сменить пароль и timezone.
Регистрация: только администратор (или ресепшен в своём зале) создаёт пользователей. Телефон + пароль DEFAULT_CLIENT_PASSWORD из env, который передаётся лично при создании. Саморегистрации нет. Пользователь может сменить пароль через `POST /auth/change-password`; админ или ресепшен своего зала может сбросить пароль.

3. Термины и правила
Клиент может быть привязан к нескольким тренерам и залам одновременно. Связь ClientTrainer хранит clientId + trainerId + gymId + isActive + assignedBy. Связь создаёт ADMIN или RECEPTION (assignedBy=ADMIN/RECEPTION), либо клиент сам выбирает тренера в зале (assignedBy=CLIENT). Активная связь нужна для доступа тренера к клиенту и для broadcast-уведомлений.

Тренажёр = экземпляр в зале. Один и тот же тип («Жим лёжа») в разных залах — разные записи с собственными min/max веса.

Упражнение = справочник. Может требовать оборудование или нет. В тренировке exercise_id + опционально equipment_id.

startWeight — неизменный. Задаётся при создании клиента, используется как точка отсчёта для графика «с какого веса начал».

Замер веса добавляет тренер при активной связи с клиентом, а также ADMIN и RECEPTION (ресепшен — только клиентам своего зала).

Fallback план→факт. Если клиент не ввёл фактический вес/повторы — в отчёте actualWeight = plannedWeight, actualReps = plannedReps, isActualFallback = true.

Часовой пояс: по умолчанию Asia/Novosibirsk. Каждый пользователь может сменить в настройках. В БД все DateTime — timestamptz (UTC). Workout.date — DATE (без времени).

Единицы: вес — кг, рост — см, жир — %, возраст вычисляется из birthdate.

4. Функциональные требования
4.1. Администратор (web)
CRUD тренеров: телефон, имя. Пароль = DEFAULT_CLIENT_PASSWORD из env, возвращается только в ответе на создание, повторно не выдаётся.

Сброс пароля пользователя: новый пароль выдаётся один раз в ответе, все refresh-токены пользователя инвалидируются.

CRUD клиентов: телефон, имя, пол, рост, дата рождения, стартовый вес, стартовый % жира, цель, заметки.

Добавление замеров веса клиентам: вес (кг), % жира, дата/время, комментарий.

CRUD залов: название, адрес, активность. В MVP `isActive` влияет на отображение и доступность в справочниках, но не блокирует исторические операции и прямые ссылки.

CRUD тренажёров в зале: название, тип (MACHINE/FREE_WEIGHT/CARDIO/OTHER), min/max вес, фото, описание. Валидация min <= max.

CRUD упражнений: название, тип, группа мышц, требует ли оборудование, видео-URL, описание.

CRUD продуктов питания: название, ккал, белки, жиры, углеводы (все ≥ 0).

Назначение связи клиент↔тренер↔зал. Деактивация связи (мягкое удаление).

Загрузка фото (jpg/png/webp, до 5 MB).

Рассылка уведомлений: заголовок + текст + опционально gym_id. Если gym_id задан — уходит клиентам с активной связью в этом зале.

Входящие уведомления и отметка о прочтении — для всех ролей.

Чаты с клиентами и тренерами (1:1).

4.2. Тренер (mobile)
Список своих клиентов (активная связь).

Создание тренировки: выбрать клиента → зал → шаблон (опционально, с возможностью корректировки) или набор с нуля → чекбоксами выбрать упражнения/тренажёры → указать вес, подходы, повторения → дата → отправить клиенту.

CRUD шаблонов тренировок.

Удаление тренера — мягкое: тренер архивируется, не может войти и не отображается в списках; тренировки, замеры и результаты сохраняются.

Управление тренировками клиента (просмотр, редактирование).

Добавление замеров веса: вес (кг), % жира, дата/время, комментарий. Только при активной связи.

Просмотр прогресса клиента: расхождения план/факт, история замеров, прогресс по упражнениям.

Назначение питания: тип (DAILY / POST_WORKOUT), КБЖУ, комментарий, период действия.

Чат с клиентами (1:1).

4.3. Клиент (mobile)
Календарь тренировок (диапазон дат).

Экран тренировки: список упражнений с планом, чекбокс «сделал», поле фактического веса и повторов, комментарий.

Просмотр питания: тип, КБЖУ, комментарий.

Отчёты:

Динамика веса и % жира — линейный график (две оси).

Прогресс по упражнению — план (пунктир) vs факт (сплошная), точки с fallback пунктиром/серым.

Список упражнений с историей: «начал X → сейчас Y, N записей».

Чат: с тренером, с админом (1:1).

Выбор тренера в зале: клиент видит тренеров своего зала и создаёт активную связь (assignedBy=CLIENT).

Уведомления от администратора, отметка о прочтении.

Смена пароля и часового пояса в настройках профиля.

4.4. Ресепшен (web)
Ограничен своим залом (Reception.gymId), не видит другие залы и их данные.

Просмотр своего зала.

Клиенты своего зала: список, создание, редактирование, фото.

Тренеры своего зала: список, создание, редактирование, фото.

Назначение и отвязка тренеров клиентам своего зала (assignedBy=RECEPTION).

Сброс пароля клиентам и тренерам своего зала: новый пароль выдаётся один раз, все refresh-токены пользователя инвалидируются.

Добавление замеров веса клиентам своего зала (вес, % жира, дата/время, комментарий).

Входящие уведомления и отметка о прочтении.

5. Нефункциональные требования
Платформа: Android (Flutter). Web-админка: React + Vite + Ant Design.

Backend: NestJS + Prisma + PostgreSQL + Redis.

Redis используется для распределённого rate-limit (throttler) и кеша справочников/отчётов с инвалидацией при изменении данных.

Аутентификация: JWT (access 15 мин, refresh 30 дней, rotation).

WebSocket для чата — один инстанс backend, без Redis pub/sub.

Push-уведомления: FCM.

Производительность API: списки клиентов, тренеров, тренировок, чатов и уведомлений поддерживают пагинацию `page` (с 1) и `limit` (по умолчанию 20, максимум 100), ответ содержит `items`, `total`, `page`, `limit`. Тяжёлые отчёты обязаны фильтроваться по периоду.

Отчёты: агрегация выполняется в PostgreSQL (`groupBy`/SQL), без выгрузки всех строк в память приложения.

Frontend: web-admin использует code-splitting/lazy-маршруты; mobile не строит все вкладки сразу и подгружает историю чата порциями.

Данные пользователя: при logout мобильное приложение очищает все пользовательские кеши и провайдеры.

Развёртывание: Docker / docker-compose на Ubuntu.

Тесты: e2e работают на отдельной БД `gym_test` и не затрагивают рабочую БД.

PostgreSQL: подключения только по паролю (`scram-sha-256`), без `trust`; порт публикуется только на localhost.

Офлайн-режим: вне MVP.

Оплата/абонементы: не в MVP.

6. Модель данных (итоговая)
Сущности и поля — в docs/er.md. Ключевые таблицы:

User (id, phone, passwordHash, role, name, pushToken, timezone, createdAt)

Gym, GymEquipment, Exercise, FoodProduct

Client (id, userId, gender, height, birthdate, startWeight, startFatMass, goal, notes)

Trainer (id, userId, isActive, archivedAt)

Reception (id, userId, gymId, createdAt)

ClientTrainer (clientId, trainerId, gymId, isActive, assignedBy, assignedAt)

WeightMeasurement (clientId, measuredBy, measuredAt, weight, fatMass, comment)

WorkoutTemplate, WorkoutTemplateItem

Workout (clientId, trainerId, gymId, date, status, comment, templateId)

WorkoutItem (workoutId, exerciseId, equipmentId, plannedWeight, plannedSets, plannedReps, order)

WorkoutItemResult (itemId, done, actualWeight, actualReps, clientComment, updatedAt)

NutritionRecommendation (clientId, trainerId, type, kcal, protein, fat, carbs, comment, validFrom, validTo)

Chat, Message

Notification, NotificationRecipient

RefreshToken

Полные поля, типы, связи, индексы — в docs/er.md.

7. API
OpenAPI 3.1 — в docs/api.md. Группы эндпоинтов:

Группа	Эндпоинты
system	GET /health
auth	POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me, PATCH /auth/timezone, PATCH /auth/push-token, POST /auth/change-password
admin	CRUD gyms, gym equipment, exercises, food-products, clients, trainers, receptions; links; upload; notifications; reset-password; POST /admin/clients/{id}/weight-measurements
reception	GET /reception/gyms; GET/POST /reception/clients; PUT /reception/clients/{id}; POST /reception/clients/{id}/photo; POST /reception/clients/{id}/weight-measurements; GET/POST /reception/clients/{id}/trainers; DELETE /reception/clients/{id}/trainers/{linkId}; GET/POST /reception/trainers; PUT /reception/trainers/{id}; POST /reception/trainers/{id}/photo; reset-password
trainer	GET /trainer/clients, CRUD templates, POST/PUT /trainer/workouts, POST /trainer/nutrition, GET/POST /client/{id}/weight-measurements
client	GET /client/workouts, GET /client/workouts/{id}, PUT /client/workout-items/{id}/result, GET /client/nutrition, GET /client/gyms, GET /client/gyms/{gymId}/trainers, POST /client/gyms/{gymId}/trainers/{trainerId}/link, GET /client/trainers, DELETE /client/trainers/{linkId}
reports	GET /reports/weight-dynamics, GET /reports/exercise-progress, GET /reports/exercises-summary
chat	GET /chats, GET/POST /chats/{id}/messages
notifications	GET /notifications, POST /notifications/{id}/read — для всех аутентифицированных ролей
shared	GET /exercises, GET /gyms, GET /gyms/{gymId}/equipment
8. Экраны
Web-admin: Login, Dashboard, Trainers, Clients (с drawer «Тренеры» и кнопкой «Вес»), ClientWeight, Gyms, Equipment (вложенно в зал), Exercises, FoodProducts, Notifications, Chats, Receptions; сброс пароля в карточках клиента/тренера/ресепшена.

Web-admin RECEPTION: Login, Мой зал, Клиенты, Тренеры, связи клиент↔тренер (только свой зал).

Mobile TRAINER: Login, Мои клиенты, Карточка клиента (тренировки / прогресс / питание / вес / чат), Создание тренировки (шаблон или с нуля → корректировка → отправка), Шаблоны, Прогресс, Питание, Чат, Уведомления, Настройки (TZ, смена пароля).

Mobile CLIENT: Login, Календарь, Тренировка дня (чек-лист + факт), Питание, Отчёты (Вес / Упражнения), Чат (тренер / админ), Выбор тренера в зале, Уведомления, Профиль (TZ, смена пароля).

9. Инфраструктура
Ubuntu 22.04/24.04, Docker + docker compose.

Сервисы: postgres:16-alpine, redis:7-alpine, backend (NestJS), web-admin (nginx).

Переменные env: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, DEFAULT_CLIENT_PASSWORD, ADMIN_PHONE, ADMIN_PASSWORD, DEFAULT_TIMEZONE, FCM_CREDENTIALS_JSON, CORS_ORIGINS, ENABLE_SWAGGER; для тестов — отдельная БД gym_test.

Порты: backend 8080, web-admin 3000, postgres 5432, redis 6379.

Файлы (фото тренажёров) — volume ./uploads, раздаются через /uploads/*.

PostgreSQL: `pg_hba.conf` без `trust`, только `scram-sha-256`; публикация порта — 127.0.0.1.

Seed: идемпотентный upsert админа из env.

Swagger: /api/docs.

10. Состав MVP
Входит:

Auth, все CRUD-справочники, клиенты/тренеры/связи.

Профиль клиента с полями (пол, рост, возраст, стартовый вес/жир).

Взвешивания (тренер).

Тренировки: шаблоны, создание, календарь.

Выполнение с фактическим весом/повторами и fallback план→факт.

Питание: КБЖУ + комментарий.

Отчёты: динамика веса, прогресс по упражнению, сводка по упражнениям.

Чат 1:1 (клиент↔тренер, клиент↔админ, тренер↔админ).

Уведомления от админа (broadcast по залу), inbox и отметка о прочтении для всех ролей.

FCM push.

Пагинация списков клиентов, тренеров, тренировок, чатов и уведомлений.

Мягкое удаление тренеров с сохранением истории.

UI сброса пароля (web) и смены пароля (mobile).

Отдельная БД `gym_test` для e2e.

Не входит (Этап 2+):

Офлайн-режим.

Оплата/абонементы.

iOS-приложение.

Конструктор рационов из продуктов (сейчас питание — числа + текст).

Вложения в чате.

Redis pub/sub для чата.

11. Критерии приёмки MVP
make up && make migrate && make seed поднимает стек, /health → {"status":"ok"}, Swagger доступен.

Админ входит, создаёт зал → тренажёр (с фото) → упражнение → продукт → тренера → клиента (со всеми полями профиля) → связывает клиента с тренером и залом.

Тренер входит по паролю, выданному при создании (DEFAULT_CLIENT_PASSWORD), видит клиента, создаёт замер веса, создаёт тренировку (шаблон или с нуля), назначает питание.

Клиент входит, видит тренировку в календаре, отмечает выполнение с фактическим весом/повторами, видит питание.

Пользователь может сменить пароль через POST /auth/change-password; админ или ресепшен своего зала может сбросить пароль. После смены/сброса старый refresh-токен не работает, вход со старым паролем возвращает 401.

GET /reports/weight-dynamics возвращает точки замеров.

GET /reports/exercise-progress: при пустом actualWeight точка имеет actualWeight == plannedWeight и isActualFallback: true.

GET /reports/exercises-summary возвращает firstWeight, lastWeight, recordsCount.

Все e2e-тесты зелёные: make test.

Клиент может сменить TZ; дефолт — Asia/Novosibirsk.

Уведомление, отправленное админом с gym_id, приходит клиентам с активной связью в этом зале.

Inbox и отметка о прочтении доступны всем ролям.

Клиент может сам выбрать тренера в зале; связь получает assignedBy=CLIENT.

Админ и ресепшен (в своём зале) могут добавить замер веса клиента.

Списки клиентов, тренеров, тренировок, чатов и уведомлений поддерживают page/limit и возвращают total.

Тренер с историей архивируется, его тренировки/замеры/результаты сохраняются.

E2E-тесты используют БД `gym_test`.

12. Артефакты
docs/er.md — модель данных.

docs/api.md — OpenAPI 3.1.

AGENTS.md — правила для OpenCode.

docker-compose.yml, Makefile, .env.example, README.md.

backend/, web-admin/, mobile/ (Flutter, Спринт 3).

13. План работ
Спринт	Содержание
1	Backend init, schema, auth, справочники, клиенты/тренеры/связи, профиль клиента, взвешивания, отчёты, web-админка
2	Тренировки: шаблоны, создание, календарь клиента
3	Выполнение, питание, мобильное приложение Flutter (тренер + клиент), графики отчётов
4	Чат (WS + REST), FCM broadcast, полировка, internal testing в Google Play