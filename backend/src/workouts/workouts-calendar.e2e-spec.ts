import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExerciseType,
  GymEquipmentType,
  Role,
  WorkoutStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990002601';
const CLIENT_PHONE = '+79990002602';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE];

const dayKey = (offsetDays: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

interface CalendarItem {
  id: string;
  clientId: string;
  trainerId: string;
  gymId: string;
  date: string;
  startTime: string | null;
  status: WorkoutStatus;
  items?: unknown;
}

describe('Workouts calendar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerToken: string;
  let clientToken: string;
  let workoutId: string;
  let clientId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const authedGet = (token: string, path: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}${path}`)
      .set('Authorization', `Bearer ${token}`);

  const cleanup = async () => {
    await prisma.workoutItemResult.deleteMany({
      where: {
        item: { workout: { client: { user: { phone: { in: PHONES } } } } },
      },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { client: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { client: { user: { phone: { in: PHONES } } } },
          { trainer: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.exercise.deleteMany({
      where: { name: 'E2E Calendar Exercise' },
    });
    await prisma.gymEquipment.deleteMany({
      where: { gym: { name: 'E2E Calendar Gym' } },
    });
    await prisma.gym.deleteMany({ where: { name: 'E2E Calendar Gym' } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await cleanup();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер календаря',
        timezone: 'Europe/Moscow',
      },
    });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент календаря',
        timezone: 'Europe/Moscow',
      },
    });

    const gym = await prisma.gym.create({
      data: { name: 'E2E Calendar Gym', address: 'ул. Календарная, 1' },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    await prisma.clientGym.create({
      data: { clientId: client.id, gymId: gym.id },
    });
    await prisma.clientTrainer.create({
      data: {
        clientId: client.id,
        trainerId: trainer.id,
        gymId: gym.id,
      },
    });

    const exercise = await prisma.exercise.create({
      data: { name: 'E2E Calendar Exercise', type: ExerciseType.FREE_WEIGHT },
    });
    const equipment = await prisma.gymEquipment.create({
      data: {
        gymId: gym.id,
        name: 'E2E Calendar Equipment',
        type: GymEquipmentType.FREE_WEIGHT,
      },
    });

    const workout = await prisma.workout.create({
      data: {
        clientId: client.id,
        trainerId: trainer.id,
        gymId: gym.id,
        date: new Date(`${dayKey(0)}T00:00:00.000Z`),
        startTime: '10:00',
        status: WorkoutStatus.PLANNED,
        items: {
          create: {
            exerciseId: exercise.id,
            equipmentId: equipment.id,
            plannedSets: 3,
            plannedReps: 10,
            order: 0,
          },
        },
      },
    });
    workoutId = workout.id;

    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('returns client calendar entries without workout items', async () => {
    const from = dayKey(0);
    const to = dayKey(1);

    const response = await authedGet(
      clientToken,
      `/client/workouts/calendar?from=${from}&to=${to}`,
    ).expect(200);

    const items = response.body as CalendarItem[];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: workoutId,
      clientId,
      trainerId: expect.any(String),
      gymId: expect.any(String),
      date: from,
      startTime: '10:00',
      status: WorkoutStatus.PLANNED,
    });
    expect(items[0].items).toBeUndefined();
  });

  it('returns trainer calendar entries', async () => {
    const from = dayKey(0);
    const to = dayKey(1);

    const response = await authedGet(
      trainerToken,
      `/trainer/workouts/calendar?from=${from}&to=${to}`,
    ).expect(200);

    const items = response.body as CalendarItem[];
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(workoutId);
    expect(items[0].items).toBeUndefined();
  });

  it('rejects inverted date range', async () => {
    await authedGet(
      clientToken,
      `/client/workouts/calendar?from=${dayKey(2)}&to=${dayKey(0)}`,
    ).expect(400);
  });

  it('rejects missing params', async () => {
    await authedGet(clientToken, '/client/workouts/calendar').expect(400);
  });

  it('still returns full workout by id', async () => {
    const response = await authedGet(
      clientToken,
      `/client/workouts/${workoutId}`,
    ).expect(200);

    expect(response.body.items).toHaveLength(1);
  });
});
