Техническое задание: Gym App
1. Назначение
Система для управления спортивным залом: администратор (web), тренер (mobile Android), клиент (mobile Android). Учёт тренировок, назначение заданий, питание, взвешивания, отчёты с графиками, чат, уведомления.

2. Роли и доступ
Роль	Интерфейс	Что делает
ADMIN	Web	Видит всё. Создаёт тренеров, клиентов, залы, тренажёры, упражнения, продукты питания. Рассылает уведомления по залам. Ведёт чаты с клиентами и тренерами. Сбрасывает пароли пользователей
RECEPTION	Web	Ограничен своим залом: видит и ведёт клиентов, тренеров и связи этого зала (assignedBy=RECEPTION), сбрасывает пароли клиентам и тренерам своего зала
TRAINER	Mobile	Видит своих клиентов (активная связь). Создаёт тренировки (шаблон или с нуля), назначает питание, добавляет замеры веса, смотрит прогресс и расхождения, ведёт чат с клиентами
CLIENT	Mobile	Видит календарь тренировок, отмечает выполнение с фактическим весом/повторами, смотрит питание, отчёты с графиками, чат с тренером и админом, уведомления
Регистрация: только администратор (или ресепшен в своём зале) создаёт пользователей. Телефон + пароль DEFAULT_CLIENT_PASSWORD из env, который передаётся лично при создании. Саморегистрации нет. Пользователь может сменить пароль через `POST /auth/change-password`; админ или ресепшен своего зала может сбросить пароль.

3. Термины и правила
Клиент может быть привязан к нескольким тренерам и залам одновременно. Связь ClientTrainer хранит clientId + trainerId + gymId + isActive. Активная связь нужна для доступа тренера к клиенту и для broadcast-уведомлений.

Тренажёр = экземпляр в зале. Один и тот же тип («Жим лёжа») в разных залах — разные записи с собственными min/max веса.

Упражнение = справочник. Может требовать оборудование или нет. В тренировке exercise_id + опционально equipment_id.

startWeight — неизменный. Задаётся при создании клиента, используется как точка отсчёта для графика «с какого веса начал».

Замер веса добавляет только тренер при активной связи с клиентом.

Fallback план→факт. Если клиент не ввёл фактический вес/повторы — в отчёте actualWeight = plannedWeight, actualReps = plannedReps, isActualFallback = true.

Часовой пояс: по умолчанию Asia/Novosibirsk. Каждый пользователь может сменить в настройках. В БД все DateTime — timestamptz (UTC). Workout.date — DATE (без времени).

Единицы: вес — кг, рост — см, жир — %, возраст вычисляется из birthdate.

4. Функциональные требования
4.1. Администратор (web)
CRUD тренеров: телефон, имя. Пароль = DEFAULT_CLIENT_PASSWORD из env, возвращается только в ответе на создание, повторно не выдаётся.

Сброс пароля пользователя: новый пароль выдаётся один раз в ответе, все refresh-токены пользователя инвалидируются.

CRUD клиентов: телефон, имя, пол, рост, дата рождения, стартовый вес, стартовый % жира, цель, заметки.

CRUD залов: название, адрес, активность.

CRUD тренажёров в зале: название, тип (MACHINE/FREE_WEIGHT/CARDIO/OTHER), min/max вес, фото, описание. Валидация min <= max.

CRUD упражнений: название, тип, группа мышц, требует ли оборудование, видео-URL, описание.

CRUD продуктов питания: название, ккал, белки, жиры, углеводы (все ≥ 0).

Назначение связи клиент↔тренер↔зал. Деактивация связи (мягкое удаление).

Загрузка фото (jpg/png/webp, до 5 MB).

Рассылка уведомлений: заголовок + текст + опционально gym_id. Если gym_id задан — уходит клиентам с активной связью в этом зале.

Чаты с клиентами и тренерами (1:1).

4.2. Тренер (mobile)
Список своих клиентов (активная связь).

Создание тренировки: выбрать клиента → зал → шаблон (опционально, с возможностью корректировки) или набор с нуля → чекбоксами выбрать упражнения/тренажёры → указать вес, подходы, повторения → дата → отправить клиенту.

CRUD шаблонов тренировок.

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

Уведомления от администратора, отметка о прочтении.

4.4. Ресепшен (web)
Ограничен своим залом (Reception.gymId), не видит другие залы и их данные.

Просмотр своего зала.

Клиенты своего зала: список, создание, редактирование, фото.

Тренеры своего зала: список, создание, редактирование, фото.

Назначение и отвязка тренеров клиентам своего зала (assignedBy=RECEPTION).

Сброс пароля клиентам и тренерам своего зала: новый пароль выдаётся один раз, все refresh-токены пользователя инвалидируются.

5. Нефункциональные требования
Платформа: Android (Flutter). Web-админка: React + Vite + Ant Design.

Backend: NestJS + Prisma + PostgreSQL + Redis.

Аутентификация: JWT (access 15 мин, refresh 30 дней, rotation).

WebSocket для чата — один инстанс backend, без Redis pub/sub.

Push-уведомления: FCM.

Развёртывание: Docker / docker-compose на Ubuntu.

Офлайн-режим: вне MVP.

Оплата/абонементы: не в MVP.

6. Модель данных (итоговая)
Сущности и поля — в docs/er.md. Ключевые таблицы:

User (id, phone, passwordHash, role, name, pushToken, timezone, createdAt)

Gym, GymEquipment, Exercise, FoodProduct

Client (id, userId, gender, height, birthdate, startWeight, startFatMass, goal, notes)

Trainer

Reception (id, userId, gymId, createdAt)

ClientTrainer (clientId, trainerId, gymId, isActive, assignedAt)

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
auth	POST /auth/login, POST /auth/refresh, GET /auth/me, PATCH /auth/timezone, PATCH /auth/push-token, POST /auth/change-password
admin	CRUD gyms, gym equipment, exercises, food-products, clients, trainers, receptions; links; upload; notifications; reset-password
reception	GET /reception/gyms; GET/POST /reception/clients; PUT /reception/clients/{id}; POST /reception/clients/{id}/photo; GET/POST /reception/clients/{id}/trainers; DELETE /reception/clients/{id}/trainers/{linkId}; GET/POST /reception/trainers; PUT /reception/trainers/{id}; POST /reception/trainers/{id}/photo; reset-password
trainer	GET /trainer/clients, CRUD templates, POST/PUT /trainer/workouts, POST /trainer/nutrition, GET/POST /client/{id}/weight-measurements
client	GET /client/workouts, GET /client/workouts/{id}, PUT /client/workout-items/{id}/result, GET /client/nutrition
reports	GET /reports/weight-dynamics, GET /reports/exercise-progress, GET /reports/exercises-summary
chat	GET /chats, GET/POST /chats/{id}/messages
notifications	GET /notifications, POST /notifications/{id}/read
shared	GET /exercises, GET /gyms, GET /gyms/{gymId}/equipment
8. Экраны
Web-admin: Login, Dashboard, Trainers, Clients (с drawer «Тренеры» и кнопкой «Вес»), ClientWeight, Gyms, Equipment (вложенно в зал), Exercises, FoodProducts, Notifications, Chats, Receptions.

Web-admin RECEPTION: Login, Мой зал, Клиенты, Тренеры, связи клиент↔тренер (только свой зал).

Mobile TRAINER: Login, Мои клиенты, Карточка клиента (тренировки / прогресс / питание / вес / чат), Создание тренировки (шаблон или с нуля → корректировка → отправка), Шаблоны, Прогресс, Питание, Чат, Уведомления, Настройки (TZ).

Mobile CLIENT: Login, Календарь, Тренировка дня (чек-лист + факт), Питание, Отчёты (Вес / Упражнения), Чат (тренер / админ), Уведомления, Профиль (TZ).

9. Инфраструктура
Ubuntu 22.04/24.04, Docker + docker compose.

Сервисы: postgres:16-alpine, redis:7-alpine, backend (NestJS), web-admin (nginx).

Переменные env: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, DEFAULT_CLIENT_PASSWORD, ADMIN_PHONE, ADMIN_PASSWORD, DEFAULT_TIMEZONE, FCM_CREDENTIALS_JSON.

Порты: backend 8080, web-admin 3000, postgres 5432, redis 6379.

Файлы (фото тренажёров) — volume ./uploads, раздаются через /uploads/*.

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

Уведомления от админа (broadcast по залу).

FCM push.

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