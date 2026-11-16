# ER — модель данных (актуально на 2026-11-15)

Источник истины — `backend/prisma/schema.prisma`. Все `DateTime` хранятся как
`timestamptz` (UTC); `Workout.date`, `Client.birthdate`, `validFrom/validTo`
имеют тип `date`. Идентификаторы — UUID.

## Enum

- `Role`: `ADMIN`, `RECEPTION`, `TRAINER`, `CLIENT`
- `GymEquipmentType`: `MACHINE`, `FREE_WEIGHT`, `CARDIO`, `OTHER`
- `ExerciseType`: `EQUIPMENT`, `FREE_WEIGHT`, `BODYWEIGHT`, `CARDIO`
- `Gender`: `MALE`, `FEMALE`, `OTHER`
- `WorkoutStatus`: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `AUTO_CLOSED`, `MISSED`
- `NutritionType`: `DAILY`, `POST_WORKOUT`
- `ChatType`: `CLIENT_TRAINER`, `CLIENT_ADMIN`, `TRAINER_ADMIN`
- `NotificationType`: `SYSTEM`, `WORKOUT`, `MESSAGE`, `CHAT`, `NUTRITION`

## User

`id uuid PK`, `phone text UNIQUE`, `passwordHash text`, `role Role`,
`name text`, `pushToken text? UNIQUE`, `timezone text DEFAULT 'Asia/Novosibirsk'`,
`createdAt timestamptz`.

Связи: `client?`, `trainer?`, `reception?`, измерения (`Measurer`), сообщения,
уведомления, получатели, refresh-токены, админские чаты, созданные шаблоны.

## Gym

`id uuid PK`, `name text`, `address text`, `isActive bool DEFAULT true`,
`createdAt timestamptz`. В MVP `isActive` информационный: не блокирует
исторические операции и прямые ссылки.

## GymEquipment

`id uuid PK`, `gymId FK→Gym`, `name text`, `type GymEquipmentType`,
`minWeight float?`, `maxWeight float?`, `photoUrl text?`, `description text?`,
`createdAt timestamptz`. Валидация `minWeight <= maxWeight`.
Индекс: `(gymId)` через связь.

## Exercise

`id uuid PK`, `name text`, `type ExerciseType`, `muscleGroup text?`,
`requiresEquipment bool DEFAULT false`, `videoUrl text?`, `description text?`,
`isActive bool DEFAULT true`, `archivedAt timestamptz?`, `createdAt timestamptz`.
Индекс: `(isActive)`. Soft delete: `isActive=false` + `archivedAt=now()`;
история тренировок сохраняется, архивное упражнение недоступно для новых
шаблонов.

## FoodProduct

`id uuid PK`, `name text`, `kcal float`, `protein float`, `fat float`,
`carbs float`, `createdAt timestamptz`. Все значения ≥ 0.

## Goal

`id uuid PK`, `name text UNIQUE`, `description text?`,
`isActive bool DEFAULT true`, `sortOrder int DEFAULT 0`,
`createdAt timestamptz`, `updatedAt timestamptz`. Индекс: `(isActive, sortOrder)`.

## Client

`id uuid PK`, `userId uuid UNIQUE FK→User`, `photoUrl text?`,
`gender Gender?`, `height float?` (см), `birthdate date?`,
`startWeight float?` (кг, неизменяемый), `startFatMass float?` (%),
`goal text?` (legacy-текст), `goalId uuid? FK→Goal`, `notes text?`,
`createdAt timestamptz`. Индекс: `(goalId)`. `age` не хранится, вычисляется.

## Trainer

`id uuid PK`, `userId uuid UNIQUE FK→User`, `photoUrl text?`,
`isActive bool DEFAULT true`, `archivedAt timestamptz?`, `createdAt timestamptz`.
Индекс: `(isActive)`. Soft delete; restore не предусмотрен.

## ClientTrainer

`id uuid PK`, `clientId FK→Client`, `trainerId FK→Trainer`, `gymId FK→Gym`,
`isActive bool DEFAULT true`, `assignedBy text DEFAULT 'ADMIN'`
(`ADMIN|RECEPTION|CLIENT`), `assignedById uuid? FK→User`,
`assignedAt timestamptz`.
Уникальность: `(clientId, trainerId, gymId)`.
Индексы: `(gymId, isActive)`, `(trainerId, isActive)`, `(clientId, isActive)`.

## TrainerGym

`id uuid PK`, `trainerId FK→Trainer`, `gymId FK→Gym`,
`isActive bool DEFAULT true`, `createdAt timestamptz`.
Уникальность: `(trainerId, gymId)`. Индекс: `(gymId, isActive)`.

## ClientGym

`id uuid PK`, `clientId FK→Client`, `gymId FK→Gym`,
`isActive bool DEFAULT true`, `createdAt timestamptz`.
Уникальность: `(clientId, gymId)`. Индекс: `(gymId, isActive)`.

## Reception

`id uuid PK`, `userId uuid UNIQUE FK→User`, `gymId FK→Gym`,
`createdAt timestamptz`. Индекс: `(gymId)`.

## WeightMeasurement

`id uuid PK`, `clientId FK→Client`, `measuredBy uuid FK→User`,
`measuredAt timestamptz`, `weight float` (кг), `fatMass float?` (%),
`comment text?`, `createdAt timestamptz`.
Индекс: `(clientId, measuredAt DESC)`.
Создание: тренер при активной связи; ADMIN — любой клиент; RECEPTION — только
свой зал.

## WorkoutTemplate

`id uuid PK`, `trainerId uuid? FK→Trainer` (`SET NULL`), `gymId uuid? FK→Gym`
(`SET NULL`), `createdById uuid? FK→User` (`SET NULL`), `name text`,
`description text?`, `defaultKey text? UNIQUE`, `isActive bool DEFAULT true`,
`archivedAt timestamptz?`, `createdAt timestamptz`.
Индексы: `(trainerId)`, `(gymId, isActive)`, `(isActive)`.
Области: `GLOBAL` (`gymId=null`, `trainerId=null`), `GYM` (`gymId!=null`),
`PERSONAL` (`trainerId!=null`). Soft delete.

## WorkoutTemplateItem

`id uuid PK`, `templateId FK→WorkoutTemplate`, `exerciseId FK→Exercise`,
`equipmentId uuid? FK→GymEquipment`, `plannedWeight float?`,
`plannedSets int`, `plannedReps int`, `restSec int?`, `order int`.
Индекс: `(templateId)`.

## Workout

`id uuid PK`, `clientId FK→Client`, `trainerId FK→Trainer`, `gymId FK→Gym`,
`date date`, `startTime varchar(5)?` (`HH:mm`), `status WorkoutStatus DEFAULT PLANNED`,
`startedAt timestamptz?`, `reminderSentAt timestamptz?`, `comment text?`,
`templateId uuid? FK→WorkoutTemplate`, `createdAt timestamptz`.
Индексы: `(clientId, date)`, `(trainerId, date)`, `(gymId, date)`,
`(status)`, `(status, startedAt)`.

## WorkoutItem

`id uuid PK`, `workoutId FK→Workout`, `exerciseId FK→Exercise`,
`equipmentId uuid? FK→GymEquipment`, `plannedWeight float?`,
`plannedSets int`, `plannedReps int`, `order int`.
Индексы: `(workoutId)`, `(exerciseId)`, `(equipmentId)`.

## WorkoutItemResult

`id uuid PK`, `itemId uuid UNIQUE FK→WorkoutItem`,
`done bool DEFAULT false`, `actualWeight float?`, `actualReps int?`,
`clientComment text?`, `updatedAt timestamptz`.
Изменение запрещено в терминальных статусах тренировки
(`COMPLETED`, `AUTO_CLOSED`, `MISSED`).

## NutritionRecommendation

`id uuid PK`, `clientId FK→Client`, `trainerId FK→Trainer`,
`type NutritionType`, `kcal float?`, `protein float?`, `fat float?`,
`carbs float?`, `comment text?`, `validFrom date?`, `validTo date?`,
`isActive bool DEFAULT true`, `archivedAt timestamptz?`,
`createdAt timestamptz`. Индексы: `(clientId, createdAt)`,
`(trainerId, createdAt)`. Назначает/архивирует только тренер.

## Chat

`id uuid PK`, `type ChatType`, `clientId uuid? FK→Client`,
`trainerId uuid? FK→Trainer`, `adminId uuid? FK→User`,
`createdAt timestamptz`. Индексы: `(clientId, createdAt)`,
`(trainerId, createdAt)`, `(adminId, createdAt)`.

## Message

`id uuid PK`, `chatId FK→Chat`, `senderId FK→User`, `text text`,
`attachmentUrl text?`, `createdAt timestamptz`, `readAt timestamptz?`.
Индекс: `(chatId, createdAt)`. Вложения в MVP не используются.

## Notification

`id uuid PK`, `gymId uuid? FK→Gym`, `type NotificationType DEFAULT SYSTEM`,
`entityId uuid?` (id тренировки/чата/сообщения/питания), `title text`,
`body text`, `senderId FK→User`, `createdAt timestamptz`.
Индексы: `(gymId, createdAt)`, `(senderId)`, `(type, createdAt)`.

## NotificationRecipient

`id uuid PK`, `notificationId FK→Notification`, `userId FK→User`,
`readAt timestamptz?`. Уникальность: `(notificationId, userId)`.
Индекс: `(userId, readAt)`.

## RefreshToken

`id uuid PK`, `userId FK→User`, `tokenHash text`, `expiresAt timestamptz`.
Индекс: `(userId)`. Ротация при refresh; смена/сброс пароля и архивация
тренера отзывают все токены пользователя.

## Миграции

`20261108121212_init`, `20261111120000_multi_gym`,
`20261111130000_security_hardening`, `20261111140000_reception`,
`20261112120000_goals`, `20261112130000_perf_indexes`,
`20261113100000_trainer_archive`,
`20261113120000_global_workout_templates`,
`20261113150000_workout_started_at`,
`20261114100000_workout_statuses_tz`,
`20261115133608_notifications_inbox_types`.
