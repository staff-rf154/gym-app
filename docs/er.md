# ER — модели MVP (финальная версия)

## User
id uuid PK, phone text UNIQUE, passwordHash text, role enum[ADMIN,TRAINER,CLIENT],
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

## Client
id uuid PK, userId uuid UNIQUE FK→User,
gender enum[MALE,FEMALE,OTHER]?,
height float?,                   -- см
birthdate date?,                 -- для вычисления age
startWeight float?,              -- кг, неизменный
startFatMass float?,             -- %
goal text?, notes text?
-- age не хранится, вычисляется из birthdate

## Trainer
id uuid PK, userId uuid UNIQUE FK→User

## ClientTrainer
id uuid PK, clientId uuid FK→Client, trainerId uuid FK→Trainer, gymId uuid FK→Gym,
isActive bool default true, assignedAt timestamptz default now()
INDEX (gymId, isActive)

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
