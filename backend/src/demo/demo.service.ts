import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExerciseType,
  Gender,
  GymEquipmentType,
  NutritionType,
  Role,
  WorkoutStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ensureDefaultConfiguration } from '../default-config/default-config';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_PHONE_PREFIX = '+7999555';
const DEMO_GYM_PREFIX = 'Демо-зал';
const DEMO_EXERCISE_MARKER = '[demo]';
const DEMO_PASSWORD_FALLBACK = 'DemoPass123!';
const BCRYPT_ROUNDS = 12;

interface DemoEquipmentSpec {
  name: string;
  type: GymEquipmentType;
  minWeight?: number;
  maxWeight?: number;
}

interface DemoGymSpec {
  name: string;
  address: string;
  equipment: DemoEquipmentSpec[];
}

interface DemoTrainerSpec {
  name: string;
  gymIndex: number;
}

interface DemoReceptionSpec {
  name: string;
  gymIndex: number;
}

interface DemoClientSpec {
  name: string;
  gender: Gender;
  height: number;
  startWeight: number;
  startFatMass: number;
  goal: string;
}

interface DemoExerciseSpec {
  name: string;
  type: ExerciseType;
  muscleGroup: string;
  requiresEquipment: boolean;
}

interface DemoEquipmentRecord {
  id: string;
  name: string;
  type: GymEquipmentType;
  maxWeight: number | null;
}

interface DemoExerciseRecord {
  id: string;
  name: string;
  type: ExerciseType;
  muscleGroup: string;
}

export interface DemoStatus {
  loaded: boolean;
  gyms: number;
  trainers: number;
  clients: number;
  receptions: number;
  workouts: number;
}

export interface DemoLoadResult extends DemoStatus {
  equipment: number;
  exercises: number;
  templates: number;
  defaultEquipment: number;
  defaultExercises: number;
  defaultTemplates: number;
  measurements: number;
  nutrition: number;
}

export interface DemoClearResult {
  cleared: boolean;
  gyms: number;
  trainers: number;
  clients: number;
  receptions: number;
  workouts: number;
}

const DEMO_GYMS: DemoGymSpec[] = [
  {
    name: 'Демо-зал «Центральный»',
    address: 'г. Новосибирск, ул. Демонстрационная, 1',
    equipment: [
      {
        name: 'Беговая дорожка Technogym',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Гребной тренажёр Concept2',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Жим ногами',
        type: GymEquipmentType.MACHINE,
        minWeight: 20,
        maxWeight: 200,
      },
      {
        name: 'Гакк-приседания',
        type: GymEquipmentType.MACHINE,
        minWeight: 20,
        maxWeight: 180,
      },
      {
        name: 'Кроссовер',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 80,
      },
      {
        name: 'Тяга верхнего блока',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 100,
      },
      {
        name: 'Жим от груди',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 100,
      },
      {
        name: 'Скамья Скотта',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 60,
      },
      {
        name: 'Стойка для приседаний',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 20,
        maxWeight: 200,
      },
      {
        name: 'Гантельный ряд 2-40 кг',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 2,
        maxWeight: 40,
      },
    ],
  },
  {
    name: 'Демо-зал «Северный»',
    address: 'г. Новосибирск, ул. Северная, 15',
    equipment: [
      {
        name: 'Велотренажёр Matrix',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Эллиптический тренажёр',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Жим лёжа в тренажёре',
        type: GymEquipmentType.MACHINE,
        minWeight: 10,
        maxWeight: 120,
      },
      {
        name: 'Тяга горизонтального блока',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 100,
      },
      {
        name: 'Разгибание ног',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 80,
      },
      {
        name: 'Сгибание ног',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 80,
      },
      {
        name: 'Смит-машина',
        type: GymEquipmentType.MACHINE,
        minWeight: 10,
        maxWeight: 150,
      },
      {
        name: 'Блочная рама',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 90,
      },
      {
        name: 'Жимовая скамья',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 20,
        maxWeight: 150,
      },
      {
        name: 'Гири 8-32 кг',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 8,
        maxWeight: 32,
      },
    ],
  },
  {
    name: 'Демо-зал «Западный»',
    address: 'г. Новосибирск, ул. Западная, 7',
    equipment: [
      {
        name: 'Беговая дорожка Life Fitness',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Степпер',
        type: GymEquipmentType.CARDIO,
      },
      {
        name: 'Жим ногами узкий',
        type: GymEquipmentType.MACHINE,
        minWeight: 20,
        maxWeight: 220,
      },
      {
        name: 'Отведение ног',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 60,
      },
      {
        name: 'Приведение ног',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 60,
      },
      {
        name: 'Тяга в наклоне',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 100,
      },
      {
        name: 'Жим плечами',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 80,
      },
      {
        name: 'Трицепс-машина',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 60,
      },
      {
        name: 'Бицепс-машина',
        type: GymEquipmentType.MACHINE,
        minWeight: 5,
        maxWeight: 60,
      },
      {
        name: 'Рама для приседаний',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 20,
        maxWeight: 180,
      },
      {
        name: 'Гантели 1-30 кг',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 1,
        maxWeight: 30,
      },
    ],
  },
];

const DEMO_RECEPTIONS: DemoReceptionSpec[] = [
  { name: 'Ирина Белова', gymIndex: 0 },
  { name: 'Светлана Гусева', gymIndex: 1 },
  { name: 'Татьяна Крылова', gymIndex: 2 },
];

const DEMO_TRAINERS: DemoTrainerSpec[] = [
  { name: 'Анна Смирнова', gymIndex: 0 },
  { name: 'Игорь Волков', gymIndex: 0 },
  { name: 'Мария Кузнецова', gymIndex: 1 },
  { name: 'Дмитрий Орлов', gymIndex: 1 },
  { name: 'Елена Соколова', gymIndex: 2 },
  { name: 'Павел Морозов', gymIndex: 2 },
];

const DEMO_CLIENTS: DemoClientSpec[] = [
  { name: 'Алексей Иванов', gender: Gender.MALE, height: 182, startWeight: 92.4, startFatMass: 24.1, goal: 'Похудение' },
  { name: 'Ольга Петрова', gender: Gender.FEMALE, height: 167, startWeight: 68.2, startFatMass: 22.5, goal: 'Тонус' },
  { name: 'Сергей Кузьмин', gender: Gender.MALE, height: 176, startWeight: 78.6, startFatMass: 18.2, goal: 'Набор массы' },
  { name: 'Наталья Волкова', gender: Gender.FEMALE, height: 172, startWeight: 74.8, startFatMass: 26.4, goal: 'Похудение' },
  { name: 'Артём Соколов', gender: Gender.MALE, height: 185, startWeight: 88.1, startFatMass: 21.7, goal: 'Набор массы' },
  { name: 'Екатерина Морозова', gender: Gender.FEMALE, height: 164, startWeight: 61.9, startFatMass: 19.6, goal: 'Тонус' },
  { name: 'Денис Лебедев', gender: Gender.MALE, height: 179, startWeight: 83.3, startFatMass: 20.1, goal: 'Похудение' },
  { name: 'Ирина Новикова', gender: Gender.FEMALE, height: 170, startWeight: 70.5, startFatMass: 23.8, goal: 'Тонус' },
  { name: 'Максим Егоров', gender: Gender.MALE, height: 188, startWeight: 97.2, startFatMass: 27.3, goal: 'Похудение' },
  { name: 'Светлана Павлова', gender: Gender.FEMALE, height: 165, startWeight: 64.7, startFatMass: 20.4, goal: 'Набор массы' },
  { name: 'Роман Козлов', gender: Gender.MALE, height: 181, startWeight: 86.4, startFatMass: 22.9, goal: 'Тонус' },
  { name: 'Юлия Семёнова', gender: Gender.FEMALE, height: 168, startWeight: 66.1, startFatMass: 21.3, goal: 'Похудение' },
  { name: 'Андрей Фролов', gender: Gender.MALE, height: 174, startWeight: 75.8, startFatMass: 17.6, goal: 'Набор массы' },
  { name: 'Марина Григорьева', gender: Gender.FEMALE, height: 171, startWeight: 72.3, startFatMass: 24.8, goal: 'Тонус' },
  { name: 'Виктор Никитин', gender: Gender.MALE, height: 183, startWeight: 90.7, startFatMass: 23.5, goal: 'Похудение' },
  { name: 'Анастасия Орлова', gender: Gender.FEMALE, height: 160, startWeight: 58.4, startFatMass: 18.8, goal: 'Тонус' },
  { name: 'Илья Захаров', gender: Gender.MALE, height: 190, startWeight: 99.5, startFatMass: 25.6, goal: 'Набор массы' },
  { name: 'Дарья Мельникова', gender: Gender.FEMALE, height: 169, startWeight: 69.6, startFatMass: 23.1, goal: 'Похудение' },
  { name: 'Никита Богданов', gender: Gender.MALE, height: 177, startWeight: 80.2, startFatMass: 19.4, goal: 'Тонус' },
  { name: 'Полина Тихонова', gender: Gender.FEMALE, height: 166, startWeight: 63.8, startFatMass: 20.9, goal: 'Набор массы' },
];

const DEMO_EXERCISES: DemoExerciseSpec[] = [
  { name: 'Жим штанги лёжа', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Приседания со штангой', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Становая тяга', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Жим ногами', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Тяга верхнего блока', type: ExerciseType.EQUIPMENT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Тяга горизонтального блока', type: ExerciseType.EQUIPMENT, muscleGroup: 'Спина', requiresEquipment: true },
  { name: 'Жим от груди в тренажёре', type: ExerciseType.EQUIPMENT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Разгибание ног', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Сгибание ног', type: ExerciseType.EQUIPMENT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Кроссовер', type: ExerciseType.EQUIPMENT, muscleGroup: 'Грудь', requiresEquipment: true },
  { name: 'Жим плечами', type: ExerciseType.EQUIPMENT, muscleGroup: 'Плечи', requiresEquipment: true },
  { name: 'Подъём на бицепс', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Французский жим', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Руки', requiresEquipment: true },
  { name: 'Отжимания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Грудь', requiresEquipment: false },
  { name: 'Подтягивания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Спина', requiresEquipment: false },
  { name: 'Планка', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Пресс', requiresEquipment: false },
  { name: 'Беговая дорожка', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Гребной тренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Велотренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Эллиптический тренажёр', type: ExerciseType.CARDIO, muscleGroup: 'Кардио', requiresEquipment: true },
  { name: 'Гиперэкстензия', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Спина', requiresEquipment: false },
  { name: 'Жим гантелей сидя', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Плечи', requiresEquipment: true },
  { name: 'Выпады с гантелями', type: ExerciseType.FREE_WEIGHT, muscleGroup: 'Ноги', requiresEquipment: true },
  { name: 'Скручивания', type: ExerciseType.BODYWEIGHT, muscleGroup: 'Пресс', requiresEquipment: false },
];

const CLIENT_COMMENTS = [
  'Техника стабильная',
  'Легко, можно добавить вес',
  'Тяжело дались последние подходы',
  'Хорошая работа',
  'Увеличить рабочий вес',
  'Следить за дыханием',
];

function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function equipmentTypeFor(exercise: ExerciseRecordForPick): GymEquipmentType | null {
  if (!exercise.requiresEquipment) {
    return null;
  }
  if (exercise.type === ExerciseType.CARDIO) {
    return GymEquipmentType.CARDIO;
  }
  if (exercise.type === ExerciseType.FREE_WEIGHT) {
    return GymEquipmentType.FREE_WEIGHT;
  }
  if (exercise.type === ExerciseType.EQUIPMENT) {
    return GymEquipmentType.MACHINE;
  }
  return null;
}

interface ExerciseRecordForPick extends DemoExerciseRecord {
  requiresEquipment: boolean;
}

interface PlannedItem {
  exerciseId: string;
  equipmentId: string | null;
  plannedWeight: number | null;
  plannedSets: number;
  plannedReps: number;
  order: number;
}

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async status(): Promise<DemoStatus> {
    const [gyms, trainers, clients, receptions, workouts] = await this.prisma
      .$transaction([
        this.prisma.gym.count({
          where: { name: { startsWith: DEMO_GYM_PREFIX } },
        }),
        this.prisma.trainer.count({
          where: {
            user: { phone: { startsWith: DEMO_PHONE_PREFIX } },
          },
        }),
        this.prisma.client.count({
          where: {
            user: { phone: { startsWith: DEMO_PHONE_PREFIX } },
          },
        }),
        this.prisma.reception.count({
          where: {
            user: { phone: { startsWith: DEMO_PHONE_PREFIX } },
          },
        }),
        this.prisma.workout.count({
          where: { gym: { name: { startsWith: DEMO_GYM_PREFIX } } },
        }),
      ]);

    return {
      loaded:
        gyms > 0 ||
        trainers > 0 ||
        clients > 0 ||
        receptions > 0 ||
        workouts > 0,
      gyms,
      trainers,
      clients,
      receptions,
      workouts,
    };
  }

  async load(): Promise<DemoLoadResult> {
    const current = await this.status();
    if (current.loaded) {
      throw new ConflictException(
        'Демо-данные уже загружены. Сначала очистите их.',
      );
    }

    const password =
      this.configService.get<string>('DEFAULT_CLIENT_PASSWORD') ??
      DEMO_PASSWORD_FALLBACK;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const today = startOfUtcDay(new Date());
    const startDate = addDays(today, -91);

    const gymIds = DEMO_GYMS.map(() => randomUUID());
    const gymsData = DEMO_GYMS.map((gym, index) => ({
      id: gymIds[index],
      name: gym.name,
      address: gym.address,
      isActive: true,
    }));
    await this.prisma.gym.createMany({ data: gymsData });

    const equipmentByGym: DemoEquipmentRecord[][] = [];
    const equipmentRows: {
      id: string;
      gymId: string;
      name: string;
      type: GymEquipmentType;
      minWeight: number | null;
      maxWeight: number | null;
      description: string;
    }[] = [];

    DEMO_GYMS.forEach((gym, gymIndex) => {
      const records: DemoEquipmentRecord[] = gym.equipment.map((item) => {
        const id = randomUUID();
        const maxWeight = item.maxWeight ?? null;
        equipmentRows.push({
          id,
          gymId: gymIds[gymIndex],
          name: item.name,
          type: item.type,
          minWeight: item.minWeight ?? null,
          maxWeight,
          description: `${DEMO_EXERCISE_MARKER} Тренажёр демо-зала «${gym.name.replace(`${DEMO_GYM_PREFIX} `, '').replace(/[«»]/g, '')}»`,
        });
        return {
          id,
          name: item.name,
          type: item.type,
          maxWeight,
        };
      });
      equipmentByGym.push(records);
    });

    await this.prisma.gymEquipment.createMany({ data: equipmentRows });

    const exercises = await this.ensureExercises();
    const exercisesById = new Map(exercises.map((item) => [item.id, item]));

    const defaults = await ensureDefaultConfiguration(this.prisma, null);

    const trainerUserIds = DEMO_TRAINERS.map(
      (_, index) =>
        `${DEMO_PHONE_PREFIX}00${String(index + 1).padStart(2, '0')}`,
    );
    const clientUserIds = DEMO_CLIENTS.map(
      (_, index) =>
        `${DEMO_PHONE_PREFIX}01${String(index + 1).padStart(2, '0')}`,
    );
    const receptionUserIds = DEMO_RECEPTIONS.map(
      (_, index) =>
        `${DEMO_PHONE_PREFIX}02${String(index + 1).padStart(2, '0')}`,
    );

    const usersData = [
      ...DEMO_TRAINERS.map((trainer, index) => ({
        id: randomUUID(),
        phone: trainerUserIds[index],
        passwordHash,
        role: Role.TRAINER,
        name: `Демо-тренер ${trainer.name}`,
      })),
      ...DEMO_CLIENTS.map((client, index) => ({
        id: randomUUID(),
        phone: clientUserIds[index],
        passwordHash,
        role: Role.CLIENT,
        name: `Демо-клиент ${client.name}`,
      })),
      ...DEMO_RECEPTIONS.map((reception, index) => ({
        id: randomUUID(),
        phone: receptionUserIds[index],
        passwordHash,
        role: Role.RECEPTION,
        name: `Демо-ресепшен ${reception.name}`,
      })),
    ];
    await this.prisma.user.createMany({ data: usersData });

    const trainerRows = DEMO_TRAINERS.map((trainer, index) => ({
      id: randomUUID(),
      userId: usersData[index].id,
      gymIndex: trainer.gymIndex,
      name: trainer.name,
    }));
    await this.prisma.trainer.createMany({
      data: trainerRows.map((trainer) => ({
        id: trainer.id,
        userId: trainer.userId,
      })),
    });

    const clientRows = DEMO_CLIENTS.map((client, index) => ({
      id: randomUUID(),
      userId: usersData[DEMO_TRAINERS.length + index].id,
      gymIndex: index < 7 ? 0 : index < 14 ? 1 : 2,
      spec: client,
    }));
    await this.prisma.client.createMany({
      data: clientRows.map((client) => ({
        id: client.id,
        userId: client.userId,
        gender: client.spec.gender,
        height: client.spec.height,
        birthdate: addDays(today, -Math.round(22 + Math.random() * 20) * 365),
        startWeight: client.spec.startWeight,
        startFatMass: client.spec.startFatMass,
        goal: client.spec.goal,
      })),
    });

    await this.prisma.trainerGym.createMany({
      data: trainerRows.map((trainer) => ({
        id: randomUUID(),
        trainerId: trainer.id,
        gymId: gymIds[trainer.gymIndex],
        isActive: true,
      })),
    });

    await this.prisma.clientGym.createMany({
      data: clientRows.map((client) => ({
        id: randomUUID(),
        clientId: client.id,
        gymId: gymIds[client.gymIndex],
        isActive: true,
      })),
    });

    const receptionRows = DEMO_RECEPTIONS.map((reception, index) => ({
      id: randomUUID(),
      userId:
        usersData[DEMO_TRAINERS.length + DEMO_CLIENTS.length + index].id,
      gymId: gymIds[reception.gymIndex],
    }));
    await this.prisma.reception.createMany({ data: receptionRows });

    const clientsWithTrainer = clientRows.map((client, index) => {
      const trainerIndex =
        client.gymIndex === 0 ? index % 2 : client.gymIndex === 1 ? 2 + (index % 2) : 4 + (index % 2);
      return {
        ...client,
        trainer: trainerRows[trainerIndex],
        trainerIndex,
      };
    });

    await this.prisma.clientTrainer.createMany({
      data: clientsWithTrainer.map((client) => ({
        id: randomUUID(),
        clientId: client.id,
        trainerId: client.trainer.id,
        gymId: gymIds[client.gymIndex],
        isActive: true,
        assignedBy: 'ADMIN',
      })),
    });

    const templateRows: {
      id: string;
      trainerId: string;
      name: string;
      description: string;
      gymIndex: number;
      focus: number;
    }[] = [];
    const templateItemRows: {
      id: string;
      templateId: string;
      exerciseId: string;
      equipmentId: string | null;
      plannedWeight: number | null;
      plannedSets: number;
      plannedReps: number;
      restSec: number | null;
      order: number;
    }[] = [];

    trainerRows.forEach((trainer, trainerIndex) => {
      const gymEquipment = equipmentByGym[trainer.gymIndex];
      [0, 1].forEach((focus) => {
        const templateId = randomUUID();
        const templateName =
          focus === 0 ? 'Демо: Верх тела' : 'Демо: Низ тела';
        templateRows.push({
          id: templateId,
          trainerId: trainer.id,
          name: templateName,
          description: `${DEMO_EXERCISE_MARKER} Шаблон тренера ${trainer.name}`,
          gymIndex: trainer.gymIndex,
          focus,
        });

        const items = this.pickItems(
          exercises,
          gymEquipment,
          gymEquipment[0]?.id ?? '',
          trainerIndex * 100 + focus * 10 + 1,
          focus,
          4 + (focus === 0 ? 1 : 0),
        );
        items.forEach((item, itemIndex) => {
          templateItemRows.push({
            id: randomUUID(),
            templateId,
            exerciseId: item.exerciseId,
            equipmentId: item.equipmentId,
            plannedWeight: item.plannedWeight,
            plannedSets: item.plannedSets,
            plannedReps: item.plannedReps,
            restSec: item.plannedSets === 1 ? 0 : 90,
            order: itemIndex + 1,
          });
        });
      });
    });

    await this.prisma.workoutTemplate.createMany({
      data: templateRows.map((template) => ({
        id: template.id,
        trainerId: template.trainerId,
        name: template.name,
        description: template.description,
      })),
    });
    await this.prisma.workoutTemplateItem.createMany({
      data: templateItemRows,
    });

    const workoutRows: {
      id: string;
      clientId: string;
      trainerId: string;
      gymId: string;
      date: Date;
      status: WorkoutStatus;
      comment: string | null;
      templateId: string | null;
      createdAt: Date;
    }[] = [];
    const workoutItemRows: {
      id: string;
      workoutId: string;
      exerciseId: string;
      equipmentId: string | null;
      plannedWeight: number | null;
      plannedSets: number;
      plannedReps: number;
      order: number;
    }[] = [];
    const resultRows: {
      id: string;
      itemId: string;
      done: boolean;
      actualWeight: number | null;
      actualReps: number | null;
      clientComment: string | null;
    }[] = [];

    clientsWithTrainer.forEach((client, clientIndex) => {
      const random = createRandom(10_000 + clientIndex * 7919);
      const gymEquipment = equipmentByGym[client.gymIndex];
      const dayShift = clientIndex % 2;
      const sessions: { date: Date; focus: number }[] = [];

      for (let week = 0; week < 13; week += 1) {
        [0, 2, 4].forEach((offset, sessionIndex) => {
          const date = addDays(
            startDate,
            week * 7 + offset + dayShift,
          );
          if (date <= today) {
            sessions.push({ date, focus: sessionIndex });
          }
        });
      }

      sessions.forEach((session, sessionIndex) => {
        const workoutId = randomUUID();
        const isMissed = random() < 0.08;
        const status = isMissed ? WorkoutStatus.MISSED : WorkoutStatus.COMPLETED;
        const itemCount = 4 + (random() < 0.5 ? 1 : 0) + (random() < 0.2 ? 1 : 0);
        const items = this.pickItems(
          exercises,
          gymEquipment,
          workoutId,
          clientIndex * 10_000 + sessionIndex * 37 + 1,
          session.focus,
          itemCount,
        );

        workoutRows.push({
          id: workoutId,
          clientId: client.id,
          trainerId: client.trainer.id,
          gymId: gymIds[client.gymIndex],
          date: session.date,
          status,
          comment:
            random() < 0.25
              ? 'Демонстрационная тренировка: следить за техникой'
              : null,
          templateId: null,
          createdAt: addDays(session.date, -1),
        });

        items.forEach((item, itemIndex) => {
          const itemId = randomUUID();
          const exercise = exercisesById.get(item.exerciseId);
          workoutItemRows.push({
            id: itemId,
            workoutId,
            exerciseId: item.exerciseId,
            equipmentId: item.equipmentId,
            plannedWeight: item.plannedWeight,
            plannedSets: item.plannedSets,
            plannedReps: item.plannedReps,
            order: itemIndex + 1,
          });

          if (status === WorkoutStatus.COMPLETED) {
            const isCardio = exercise?.type === ExerciseType.CARDIO;
            resultRows.push({
              id: randomUUID(),
              itemId,
              done: true,
              actualWeight:
                item.plannedWeight === null
                  ? null
                  : roundTo(
                      item.plannedWeight + (random() < 0.5 ? 0 : 2.5),
                      2.5,
                    ),
              actualReps: isCardio
                ? item.plannedReps + Math.floor(random() * 10)
                : Math.max(
                    1,
                    item.plannedReps + Math.floor(random() * 3) - 1,
                  ),
              clientComment:
                random() < 0.1
                  ? CLIENT_COMMENTS[
                      Math.floor(random() * CLIENT_COMMENTS.length)
                    ]
                  : null,
            });
          }
        });
      });
    });

    await this.prisma.workout.createMany({ data: workoutRows });
    await this.prisma.workoutItem.createMany({ data: workoutItemRows });
    if (resultRows.length > 0) {
      await this.prisma.workoutItemResult.createMany({ data: resultRows });
    }

    const measurementRows: {
      id: string;
      clientId: string;
      measuredBy: string;
      measuredAt: Date;
      weight: number;
      fatMass: number | null;
      comment: string | null;
    }[] = [];

    clientsWithTrainer.forEach((client, clientIndex) => {
      const random = createRandom(20_000 + clientIndex * 104_729);
      const spec = client.spec;
      const targetDelta =
        spec.goal === 'Похудение'
          ? -5.5
          : spec.goal === 'Набор массы'
            ? 3.2
            : -1.2;
      const fatDelta =
        spec.goal === 'Похудение'
          ? -3.5
          : spec.goal === 'Набор массы'
            ? 0.8
            : -1.6;

      for (let week = 0; week < 13; week += 1) {
        const progress = week / 12;
        const weight =
          spec.startWeight +
          targetDelta * progress +
          (random() - 0.5) * 0.8;
        const fatMass =
          spec.startFatMass +
          fatDelta * progress +
          (random() - 0.5) * 0.6;

        measurementRows.push({
          id: randomUUID(),
          clientId: client.id,
          measuredBy: client.trainer.userId,
          measuredAt: addDays(startDate, week * 7 + 1),
          weight: Math.round(weight * 10) / 10,
          fatMass: Math.max(4, Math.round(fatMass * 10) / 10),
          comment:
            week % 4 === 0
              ? 'Плановый замер в рамках демо-данных'
              : null,
        });
      }
    });

    await this.prisma.weightMeasurement.createMany({
      data: measurementRows,
    });

    const nutritionRows: {
      id: string;
      clientId: string;
      trainerId: string;
      type: NutritionType;
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      comment: string;
      validFrom: Date;
      validTo: Date;
    }[] = [];

    clientsWithTrainer.forEach((client) => {
      const spec = client.spec;
      const kcal =
        spec.goal === 'Похудение'
          ? Math.round(spec.startWeight * 26)
          : spec.goal === 'Набор массы'
            ? Math.round(spec.startWeight * 34)
            : Math.round(spec.startWeight * 30);
      const protein = Math.round(spec.startWeight * 1.8);
      const fat = Math.round(spec.startWeight * 0.9);
      const carbs = Math.max(
        80,
        Math.round((kcal - protein * 4 - fat * 9) / 4),
      );

      nutritionRows.push({
        id: randomUUID(),
        clientId: client.id,
        trainerId: client.trainer.id,
        type: NutritionType.DAILY,
        kcal,
        protein,
        fat,
        carbs,
        comment: `Демо-рекомендация: цель «${spec.goal}»`,
        validFrom: startDate,
        validTo: today,
      });
      nutritionRows.push({
        id: randomUUID(),
        clientId: client.id,
        trainerId: client.trainer.id,
        type: NutritionType.POST_WORKOUT,
        kcal: 320,
        protein: 25,
        fat: 6,
        carbs: 42,
        comment: 'Демо-рекомендация: приём после тренировки',
        validFrom: startDate,
        validTo: today,
      });
    });

    await this.prisma.nutritionRecommendation.createMany({
      data: nutritionRows,
    });

    return {
      loaded: true,
      gyms: gymsData.length,
      trainers: trainerRows.length,
      clients: clientRows.length,
      receptions: receptionRows.length,
      workouts: workoutRows.length,
      equipment: equipmentRows.length,
      exercises: exercises.length,
      templates: templateRows.length,
      defaultEquipment: defaults.equipment,
      defaultExercises: defaults.exercises,
      defaultTemplates: defaults.templates,
      measurements: measurementRows.length,
      nutrition: nutritionRows.length,
    };
  }

  async clear(): Promise<DemoClearResult> {
    const before = await this.status();

    await this.prisma.$transaction(
      async (tx) => {
        const demoUsers = await tx.user.findMany({
          where: { phone: { startsWith: DEMO_PHONE_PREFIX } },
          select: { id: true },
        });
        const userIds = demoUsers.map((user) => user.id);

        const demoGyms = await tx.gym.findMany({
          where: { name: { startsWith: DEMO_GYM_PREFIX } },
          select: { id: true },
        });
        const gymIds = demoGyms.map((gym) => gym.id);

        const demoClients = await tx.client.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        });
        const clientIds = demoClients.map((client) => client.id);

        const demoTrainers = await tx.trainer.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        });
        const trainerIds = demoTrainers.map((trainer) => trainer.id);

        await tx.refreshToken.deleteMany({
          where: { userId: { in: userIds } },
        });

        const demoChats = await tx.chat.findMany({
          where: {
            OR: [
              { clientId: { in: clientIds } },
              { trainerId: { in: trainerIds } },
              { adminId: { in: userIds } },
            ],
          },
          select: { id: true },
        });
        const chatIds = demoChats.map((chat) => chat.id);

        await tx.message.deleteMany({
          where: {
            OR: [
              { senderId: { in: userIds } },
              { chatId: { in: chatIds } },
            ],
          },
        });
        await tx.chat.deleteMany({ where: { id: { in: chatIds } } });

        await tx.notificationRecipient.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { notification: { senderId: { in: userIds } } },
            ],
          },
        });
        await tx.notification.deleteMany({
          where: { senderId: { in: userIds } },
        });

        const workoutWhere = {
          OR: [
            { clientId: { in: clientIds } },
            { trainerId: { in: trainerIds } },
            { gymId: { in: gymIds } },
          ],
        };

        await tx.workoutItemResult.deleteMany({
          where: { item: { workout: workoutWhere } },
        });
        await tx.workoutItem.deleteMany({
          where: { workout: workoutWhere },
        });
        await tx.workout.deleteMany({ where: workoutWhere });

        const templateWhere = {
          OR: [
            { trainerId: { in: trainerIds } },
            { name: { startsWith: 'Демо:' } },
          ],
        };
        await tx.workoutTemplateItem.deleteMany({
          where: { template: templateWhere },
        });
        await tx.workoutTemplate.deleteMany({
          where: templateWhere,
        });

        await tx.nutritionRecommendation.deleteMany({
          where: {
            OR: [
              { clientId: { in: clientIds } },
              { trainerId: { in: trainerIds } },
            ],
          },
        });
        await tx.weightMeasurement.deleteMany({
          where: { clientId: { in: clientIds } },
        });
        await tx.clientTrainer.deleteMany({
          where: {
            OR: [
              { clientId: { in: clientIds } },
              { trainerId: { in: trainerIds } },
              { gymId: { in: gymIds } },
            ],
          },
        });
        await tx.trainerGym.deleteMany({
          where: {
            OR: [
              { trainerId: { in: trainerIds } },
              { gymId: { in: gymIds } },
            ],
          },
        });
        await tx.clientGym.deleteMany({
          where: {
            OR: [
              { clientId: { in: clientIds } },
              { gymId: { in: gymIds } },
            ],
          },
        });
        await tx.reception.deleteMany({
          where: {
            OR: [
              { userId: { in: userIds } },
              { gymId: { in: gymIds } },
            ],
          },
        });
        await tx.client.deleteMany({ where: { id: { in: clientIds } } });
        await tx.trainer.deleteMany({ where: { id: { in: trainerIds } } });
        await tx.gymEquipment.deleteMany({
          where: { gymId: { in: gymIds } },
        });
        await tx.gym.deleteMany({ where: { id: { in: gymIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });

        await tx.exercise.deleteMany({
          where: {
            description: { startsWith: DEMO_EXERCISE_MARKER },
            workoutItems: { none: {} },
            templateItems: { none: {} },
          },
        });
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    return {
      cleared: true,
      gyms: before.gyms,
      trainers: before.trainers,
      clients: before.clients,
      receptions: before.receptions,
      workouts: before.workouts,
    };
  }

  private async ensureExercises(): Promise<ExerciseRecordForPick[]> {
    const existing = await this.prisma.exercise.findMany({
      where: { description: { startsWith: DEMO_EXERCISE_MARKER } },
      select: {
        id: true,
        name: true,
        type: true,
        muscleGroup: true,
        requiresEquipment: true,
      },
    });

    const byName = new Map(existing.map((exercise) => [exercise.name, exercise]));
    const missing = DEMO_EXERCISES.filter(
      (exercise) => !byName.has(exercise.name),
    ).map((exercise) => ({
      id: randomUUID(),
      name: exercise.name,
      type: exercise.type,
      muscleGroup: exercise.muscleGroup,
      requiresEquipment: exercise.requiresEquipment,
      description: `${DEMO_EXERCISE_MARKER} Базовое упражнение для демонстрационных тренировок`,
    }));

    if (missing.length > 0) {
      await this.prisma.exercise.createMany({ data: missing });
      missing.forEach((exercise) => {
        byName.set(exercise.name, {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          muscleGroup: exercise.muscleGroup,
          requiresEquipment: exercise.requiresEquipment,
        });
      });
    }

    return DEMO_EXERCISES.map((spec) => {
      const record = byName.get(spec.name);
      if (!record) {
        throw new Error(`Demo exercise not created: ${spec.name}`);
      }
      return {
        id: record.id,
        name: record.name,
        type: record.type,
        muscleGroup: record.muscleGroup ?? '',
        requiresEquipment: record.requiresEquipment,
      };
    });
  }

  private pickItems(
    exercises: ExerciseRecordForPick[],
    equipment: DemoEquipmentRecord[],
    seedSalt: string,
    seed: number,
    focus: number,
    count: number,
  ): PlannedItem[] {
    const random = createRandom(
      seed + seedSalt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0),
    );
    const focusGroups =
      focus === 0
        ? ['Грудь', 'Спина', 'Плечи', 'Руки']
        : focus === 1
          ? ['Ноги', 'Пресс']
          : null;

    let pool = focusGroups
      ? exercises.filter((exercise) =>
          focusGroups.includes(exercise.muscleGroup),
        )
      : [...exercises];

    if (pool.length < count) {
      pool = [...exercises];
    }

    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }

    const cardioExercise = exercises.find(
      (exercise) => exercise.type === ExerciseType.CARDIO,
    );
    const selected = shuffled.slice(0, count);
    if (
      focus === 2 &&
      cardioExercise &&
      !selected.some((exercise) => exercise.type === ExerciseType.CARDIO)
    ) {
      selected[selected.length - 1] = cardioExercise;
    }

    return selected.map((exercise, index) => {
      const requiredType = equipmentTypeFor(exercise);
      const candidates = requiredType
        ? equipment.filter((item) => item.type === requiredType)
        : [];
      const pick =
        candidates.length > 0
          ? candidates[Math.floor(random() * candidates.length)]
          : null;
      const isCardio = exercise.type === ExerciseType.CARDIO;
      const plannedWeight =
        pick?.maxWeight != null && !isCardio
          ? roundTo(
              pick.maxWeight * (0.25 + random() * 0.35),
              2.5,
            )
          : null;
      const plannedSets = isCardio ? 1 : 3 + (random() < 0.3 ? 1 : 0);
      const plannedReps = isCardio
        ? 20 + Math.floor(random() * 20)
        : 8 + Math.floor(random() * 8);

      return {
        exerciseId: exercise.id,
        equipmentId: pick?.id ?? null,
        plannedWeight,
        plannedSets,
        plannedReps,
        order: index + 1,
      };
    });
  }
}
