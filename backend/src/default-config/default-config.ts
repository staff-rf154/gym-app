import {
  ExerciseType,
  GymEquipmentType,
  PrismaClient,
} from '@prisma/client';

export const DEFAULT_CONFIG_MARKER = '[default]';

interface DefaultExerciseSpec {
  name: string;
  type: ExerciseType;
  muscleGroup: string;
  requiresEquipment: boolean;
}

interface DefaultEquipmentSpec {
  name: string;
  type: GymEquipmentType;
  minWeight?: number;
  maxWeight?: number;
}

interface DefaultTemplateItemSpec {
  exerciseName: string;
  sets: number;
  reps: number;
  restSec?: number;
}

interface DefaultTemplateSpec {
  key: string;
  name: string;
  description: string;
  items: DefaultTemplateItemSpec[];
}

export interface DefaultConfigurationResult {
  exercises: number;
  equipment: number;
  templates: number;
}

export const DEFAULT_EXERCISES: DefaultExerciseSpec[] = [
  { name: 'Жим штанги лёжа', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Жим гантелей лёжа', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Разведение гантелей', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Жим от груди в тренажёре', type: ExerciseType.EQUIPMENT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Кроссовер', type: ExerciseType.EQUIPMENT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Отжимания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Грудь', requiresEquipment: false },
  { name: 'Приседания со штангой', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Становая тяга', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Румынская тяга', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Выпады с гантелями', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Жим ногами', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Гакк-приседания', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Разгибание ног', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Сгибание ног', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Подъём на носки', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Тяга верхнего блока', type: ExerciseType.EQUIPMENT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Тяга горизонтального блока', type: ExerciseType.EQUIPMENT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Тяга штанги в наклоне', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Подтягивания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Спина', requiresEquipment: false },
  { name: 'Гиперэкстензия', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Спина', requiresEquipment: false },
  { name: 'Жим гантелей сидя', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Плечи', requiresEquipment: true },
  { name: 'Жим плечами', type: ExerciseType.EQUIPMENT, muscleGroup: 'Плечи', requiresEquipment: true },
  { name: 'Махи гантелями в стороны', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Плечи', requiresEquipment: true },
  { name: 'Подъём на бицепс', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Молотковые сгибания', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Французский жим', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Разгибание на трицепс на блоке', type: ExerciseType.EQUIPMENT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Скручивания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Пресс', requiresEquipment: false },
  { name: 'Планка', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Пресс', requiresEquipment: false },
  { name: 'Боковая планка', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Пресс', requiresEquipment: false },
  { name: 'Беговая дорожка', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Эллиптический тренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Велотренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Гребной тренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
];

export const POPULAR_EQUIPMENT: DefaultEquipmentSpec[] = [
  { name: 'Жим ногами', type: GymEquipmentType.MACHINE, minWeight: 20, maxWeight: 200 },
  { name: 'Гакк-приседания', type: GymEquipmentType.MACHINE, minWeight: 20, maxWeight: 180 },
  { name: 'Тяга верхнего блока', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 100 },
  { name: 'Тяга горизонтального блока', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 100 },
  { name: 'Жим от груди', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 100 },
  { name: 'Кроссовер', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 80 },
  { name: 'Смит-машина', type: GymEquipmentType.MACHINE, minWeight: 10, maxWeight: 150 },
  { name: 'Разгибание ног', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 80 },
  { name: 'Сгибание ног', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 80 },
  { name: 'Жим плечами', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 80 },
  { name: 'Бицепс-машина', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 60 },
  { name: 'Трицепс-машина', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 60 },
  { name: 'Скамья Скотта', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 60 },
  { name: 'Блочная рама', type: GymEquipmentType.MACHINE, minWeight: 5, maxWeight: 90 },
  { name: 'Беговая дорожка', type: GymEquipmentType.CARDIO },
  { name: 'Эллиптический тренажёр', type: GymEquipmentType.CARDIO },
  { name: 'Велотренажёр', type: GymEquipmentType.CARDIO },
  { name: 'Гребной тренажёр', type: GymEquipmentType.CARDIO },
  { name: 'Стойка для приседаний', type: GymEquipmentType.FREE_WEIGHT, minWeight: 20, maxWeight: 200 },
  { name: 'Жимовая скамья', type: GymEquipmentType.FREE_WEIGHT, minWeight: 20, maxWeight: 150 },
  { name: 'Гантельный ряд 2-40 кг', type: GymEquipmentType.FREE_WEIGHT, minWeight: 2, maxWeight: 40 },
  { name: 'Гири 8-32 кг', type: GymEquipmentType.FREE_WEIGHT, minWeight: 8, maxWeight: 32 },
];

export const DEFAULT_TEMPLATES: DefaultTemplateSpec[] = [
  {
    key: 'weight-up',
    name: 'Вес вверх',
    description: `${DEFAULT_CONFIG_MARKER} Базовый шаблон на набор мышечной массы`,
    items: [
      { exerciseName: 'Приседания со штангой', sets: 4, reps: 8, restSec: 120 },
      { exerciseName: 'Жим штанги лёжа', sets: 4, reps: 8, restSec: 120 },
      { exerciseName: 'Становая тяга', sets: 3, reps: 6, restSec: 150 },
      { exerciseName: 'Тяга верхнего блока', sets: 4, reps: 10, restSec: 90 },
      { exerciseName: 'Жим гантелей сидя', sets: 3, reps: 10, restSec: 90 },
      { exerciseName: 'Подъём на бицепс', sets: 3, reps: 12, restSec: 60 },
      { exerciseName: 'Французский жим', sets: 3, reps: 12, restSec: 60 },
    ],
  },
  {
    key: 'weight-down',
    name: 'Вес вниз',
    description: `${DEFAULT_CONFIG_MARKER} Базовый шаблон на снижение веса`,
    items: [
      { exerciseName: 'Беговая дорожка', sets: 1, reps: 25, restSec: 0 },
      { exerciseName: 'Приседания со штангой', sets: 4, reps: 12, restSec: 90 },
      { exerciseName: 'Жим ногами', sets: 4, reps: 15, restSec: 90 },
      { exerciseName: 'Тяга верхнего блока', sets: 3, reps: 12, restSec: 75 },
      { exerciseName: 'Жим от груди в тренажёре', sets: 3, reps: 12, restSec: 75 },
      { exerciseName: 'Планка', sets: 3, reps: 45, restSec: 60 },
      { exerciseName: 'Скручивания', sets: 3, reps: 20, restSec: 60 },
    ],
  },
  {
    key: 'tone',
    name: 'Тонус',
    description: `${DEFAULT_CONFIG_MARKER} Базовый шаблон на тонус и выносливость`,
    items: [
      { exerciseName: 'Кроссовер', sets: 3, reps: 15, restSec: 60 },
      { exerciseName: 'Тяга горизонтального блока', sets: 3, reps: 15, restSec: 60 },
      { exerciseName: 'Жим плечами', sets: 3, reps: 15, restSec: 60 },
      { exerciseName: 'Разгибание ног', sets: 3, reps: 15, restSec: 60 },
      { exerciseName: 'Сгибание ног', sets: 3, reps: 15, restSec: 60 },
      { exerciseName: 'Выпады с гантелями', sets: 3, reps: 12, restSec: 75 },
      { exerciseName: 'Планка', sets: 3, reps: 40, restSec: 45 },
      { exerciseName: 'Эллиптический тренажёр', sets: 1, reps: 20, restSec: 0 },
    ],
  },
];

export async function ensureDefaultConfiguration(
  prisma: PrismaClient,
  createdById?: string | null,
): Promise<DefaultConfigurationResult> {
  let exercisesCreated = 0;
  let equipmentCreated = 0;
  let templatesCreated = 0;

  const exerciseNames = DEFAULT_EXERCISES.map((exercise) => exercise.name);
  const existingExercises = await prisma.exercise.findMany({
    where: { name: { in: exerciseNames } },
    select: { id: true, name: true },
  });
  const exercisesByName = new Map(
    existingExercises.map((exercise) => [exercise.name, exercise.id]),
  );

  for (const spec of DEFAULT_EXERCISES) {
    if (exercisesByName.has(spec.name)) {
      continue;
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: spec.name,
        type: spec.type,
        muscleGroup: spec.muscleGroup,
        requiresEquipment: spec.requiresEquipment,
        description: `${DEFAULT_CONFIG_MARKER} Дефолтное упражнение`,
      },
    });
    exercisesByName.set(spec.name, exercise.id);
    exercisesCreated += 1;
  }

  const gyms = await prisma.gym.findMany({ select: { id: true } });

  for (const gym of gyms) {
    const existingEquipment = await prisma.gymEquipment.findMany({
      where: { gymId: gym.id },
      select: { name: true },
    });
    const existingNames = new Set(
      existingEquipment.map((equipment) => equipment.name),
    );
    const missing = POPULAR_EQUIPMENT.filter(
      (equipment) => !existingNames.has(equipment.name),
    );

    if (missing.length === 0) {
      continue;
    }

    await prisma.gymEquipment.createMany({
      data: missing.map((equipment) => ({
        gymId: gym.id,
        name: equipment.name,
        type: equipment.type,
        minWeight: equipment.minWeight ?? null,
        maxWeight: equipment.maxWeight ?? null,
        description: `${DEFAULT_CONFIG_MARKER} Популярный тренажёр`,
      })),
    });
    equipmentCreated += missing.length;
  }

  for (const spec of DEFAULT_TEMPLATES) {
    const existing = await prisma.workoutTemplate.findUnique({
      where: { defaultKey: spec.key },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const items = spec.items.map((item, index) => {
      const exerciseId = exercisesByName.get(item.exerciseName);
      if (!exerciseId) {
        throw new Error(
          `Default template exercise not found: ${item.exerciseName}`,
        );
      }

      return {
        exerciseId,
        plannedWeight: null,
        plannedSets: item.sets,
        plannedReps: item.reps,
        restSec: item.restSec ?? null,
        order: index + 1,
      };
    });

    await prisma.workoutTemplate.create({
      data: {
        defaultKey: spec.key,
        name: spec.name,
        description: spec.description,
        createdById: createdById ?? null,
        items: { create: items },
      },
    });
    templatesCreated += 1;
  }

  return {
    exercises: exercisesCreated,
    equipment: equipmentCreated,
    templates: templatesCreated,
  };
}
