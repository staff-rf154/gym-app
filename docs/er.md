# ER — модели MVP (финальная версия)

## User
id uuid PK, phone text UNIQUE, passwordHash text, role enum[ADMIN,RECEPTION,TRAINER,CLIENT],
name text, pushToken text?, timezone text default 'Asia/Novosibirsk',
createdAt timestamptz

## Gym
id uuid PK, name text, address text, isActive bool default true

## GymEquipment
id uuid PK, gymId uuid FK→Gym, name text,
type enum[MACHINE,FREE_WEIGHT,CARDIO,OTHER],
minWeight float?, maxWeight float?, photoUrl text?, description text?

## Exercise
id uuid PK, name text, type enum[EQUIPMENT,FREE_WEIGHT,BODYWEIGHT,CARDIO],
muscleGroup text?, requiresEquipment bool default false,
videoUrl text?, description text?

## FoodProduct
id uuid PK, name text, kcal float, protein float, fat float, carbs float

## Goal
id uuid PK, name text UNIQUE, description text?,
isActive boolean DEFAULT true, sortOrder int DEFAULT 0,
createdAt timestamptz, updatedAt timestamptz
-- глобальный справочник целей (не привязан к залу)

## Client
id uuid PK, userId uuid UNIQUE FK→User,
photoUrl text?,
gender enum[MALE,FEMALE,OTHER]?,
height float?,                   -- см
birthdate date?,                 -- для вычисления age
startWeight float?,              -- кг, неизменный
startFatMass float?,             -- %
goalId uuid? FK→Goal,            -- справочник целей
goal text?,                      -- legacy-текст, синхронизируется с goalId
notes text?
-- age не хранится, вычисляется из birthdate

## Trainer
id uuid PK, userId uuid UNIQUE FK→User, photoUrl text?

## ClientTrainer
id uuid PK, clientId uuid FK→Client, trainerId uuid FK→Trainer, gymId uuid FK→Gym,
isActive bool default true,
assignedBy text default 'ADMIN',   -- ADMIN | RECEPTION | CLIENT
assignedById uuid? FK→User,        -- кто назначил (для ADMIN/RECEPTION)
assignedAt timestamptz default now()
UNIQUE (clientId, trainerId, gymId)
INDEX (gymId, isActive), INDEX (trainerId, isActive), INDEX (clientId, isActive)

## TrainerGym
id uuid PK, trainerId uuid FK→Trainer, gymId uuid FK→Gym,
isActive bool default true, createdAt timestamptz
UNIQUE (trainerId, gymId)
INDEX (gymId, isActive)

## ClientGym
id uuid PK, clientId uuid FK→Client, gymId uuid FK→Gym,
isActive bool default true, createdAt timestamptz
UNIQUE (clientId, gymId)
INDEX (gymId, isActive)

## Reception
id uuid PK, userId uuid UNIQUE FK→User, gymId uuid FK→Gym, createdAt timestamptz
INDEX (gymId)
-- роль RECEPTION добавлена в enum Role; миграция 20261111140000_reception

## WeightMeasurement
id uuid PK, clientId uuid FK→Client,
measuredBy uuid FK→User,           -- только тренер
measuredAt timestamptz,
weight float,                      -- кг
fatMass float?,                    -- %
comment text?, createdAt timestamptz
INDEX (clientId, measuredAt DESC)

## WorkoutTemplate
id uuid PK, trainerId uuid FK→Trainer, name text, description text?

## WorkoutTemplateItem
id uuid PK, templateId uuid FK→WorkoutTemplate, exerciseId uuid FK→Exercise,
equipmentId uuid? FK→GymEquipment, plannedWeight float?,
plannedSets int, plannedReps int, restSec int?, order int

## Workout
id uuid PK, clientId uuid FK→Client, trainerId uuid FK→Trainer, gymId uuid FK→Gym,
date date, status enum[PLANNED,IN_PROGRESS,DONE,SKIPPED] default PLANNED,
comment text?, templateId uuid? FK→WorkoutTemplate, createdAt timestamptz
INDEX (clientId, date), INDEX (trainerId, date)
-- Жизненный цикл: PLANNED → IN_PROGRESS → DONE; SKIPPED — пропущена.
-- Старт/завершение доступны клиенту-владельцу и тренеру тренировки; статус общий,
-- переход выполняется условным UPDATE с проверкой текущего статуса (защита от гонки).
-- После DONE/SKIPPED изменение WorkoutItemResult и состава/плана тренировки запрещено.

## WorkoutItem
id uuid PK, workoutId uuid FK→Workout, exerciseId uuid FK→Exercise,
equipmentId uuid? FK→GymEquipment, plannedWeight float?,
plannedSets int, plannedReps int, order int

## WorkoutItemResult
id uuid PK, itemId uuid UNIQUE FK→WorkoutItem, done bool default false,
actualWeight float?, actualReps int?, clientComment text?, updatedAt timestamptz

## NutritionRecommendation
id uuid PK, clientId uuid FK→Client, trainerId uuid FK→Trainer,
type enum[DAILY,POST_WORKOUT], kcal float?, protein float?, fat float?, carbs float?,
comment text?, validFrom date?, validTo date?, createdAt timestamptz

## Chat
id uuid PK, type enum[CLIENT_TRAINER,CLIENT_ADMIN,TRAINER_ADMIN],
clientId uuid? FK→Client, trainerId uuid? FK→Trainer, adminId uuid? FK→User,
createdAt timestamptz

## Message
id uuid PK, chatId uuid FK→Chat, senderId uuid FK→User, text text,
attachmentUrl text?, createdAt timestamptz, readAt timestamptz?
INDEX (chatId, createdAt)

## Notification
id uuid PK, gymId uuid? FK→Gym, title text, body text,
senderId uuid FK→User, createdAt timestamptz

## NotificationRecipient
id uuid PK, notificationId uuid FK→Notification, userId uuid FK→User, readAt timestamptz?
INDEX (userId, readAt)

## RefreshToken
id uuid PK, userId uuid FK→User, tokenHash text, expiresAt timestamptz
