import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000201';
const CLIENT_PHONE = '+79990000202';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME_PREFIX = 'E2E GymLinks';
const EXERCISE_NAME_PREFIX = 'E2E GymLinks Exercise';

describe('Gym links (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerUserId: string;
  let clientUserId: string;
  let trainerId: string;
  let clientId: string;
  let gymId: string;
  let exerciseId: string;
  let trainerToken: string;
  let clientToken: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const authed = (token: string) => ({
    get: (path: string) =>
      request(app.getHttpServer())
        .get(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
    post: (path: string) =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
  });

  const cleanup = async (): Promise<void> => {
    const gyms = await prisma.gym.findMany({
      where: { name: { startsWith: GYM_NAME_PREFIX } },
      select: { id: true },
    });
    const gymIds = gyms.map((gym) => gym.id);

    if (gymIds.length > 0) {
      const workouts = await prisma.workout.findMany({
        where: { gymId: { in: gymIds } },
        select: { id: true },
      });
      const workoutIds = workouts.map((workout) => workout.id);

      if (workoutIds.length > 0) {
        const items = await prisma.workoutItem.findMany({
          where: { workoutId: { in: workoutIds } },
          select: { id: true },
        });
        const itemIds = items.map((item) => item.id);

        if (itemIds.length > 0) {
          await prisma.workoutItemResult.deleteMany({
            where: { itemId: { in: itemIds } },
          });
        }
        await prisma.workoutItem.deleteMany({
          where: { workoutId: { in: workoutIds } },
        });
        await prisma.workout.deleteMany({ where: { id: { in: workoutIds } } });
      }

      await prisma.clientTrainer.deleteMany({
        where: { gymId: { in: gymIds } },
      });
      await prisma.clientGym.deleteMany({ where: { gymId: { in: gymIds } } });
      await prisma.trainerGym.deleteMany({ where: { gymId: { in: gymIds } } });
    }

    const phones = [TRAINER_PHONE, CLIENT_PHONE];
    await prisma.client.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });
    await prisma.exercise.deleteMany({
      where: { name: { startsWith: EXERCISE_NAME_PREFIX } },
    });
    await prisma.gym.deleteMany({
      where: { name: { startsWith: GYM_NAME_PREFIX } },
    });
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
        name: 'E2E GymLinks Тренер',
      },
    });
    trainerUserId = trainerUser.id;
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUserId },
    });
    trainerId = trainer.id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E GymLinks Клиент',
      },
    });
    clientUserId = clientUser.id;
    const client = await prisma.client.create({
      data: { userId: clientUserId },
    });
    clientId = client.id;

    const gym = await prisma.gym.create({
      data: {
        name: `${GYM_NAME_PREFIX} Зал`,
        address: 'ул. Тестовая, 14',
      },
    });
    gymId = gym.id;

    const exercise = await prisma.exercise.create({
      data: {
        name: `${EXERCISE_NAME_PREFIX} Приседание`,
        type: ExerciseType.FREE_WEIGHT,
      },
    });
    exerciseId = exercise.id;

    await prisma.trainerGym.create({
      data: { trainerId, gymId, isActive: true },
    });
    await prisma.clientGym.create({
      data: { clientId, gymId, isActive: true },
    });
    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId, isActive: true },
    });

    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /trainer/gyms возвращает залы тренера', async () => {
    const response = await authed(trainerToken).get('/trainer/gyms');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gymId,
          gymName: `${GYM_NAME_PREFIX} Зал`,
          gymAddress: 'ул. Тестовая, 14',
          isActive: true,
        }),
      ]),
    );
  });

  it('GET /client/gyms возвращает залы клиента', async () => {
    const response = await authed(clientToken).get('/client/gyms');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ gymId, isActive: true })]),
    );
  });

  it('GET /client/gyms/:gymId/trainers возвращает тренеров зала', async () => {
    const response = await authed(clientToken).get(
      `/client/gyms/${gymId}/trainers`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: trainerId,
          userId: trainerUserId,
          isLinked: true,
        }),
      ]),
    );
  });

  it('POST /trainer/workouts создаёт тренировку с выбранным залом', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/workouts')
      .send({
        client_id: clientId,
        gym_id: gymId,
        date: '2026-11-20',
        comment: 'E2E создание тренировки',
        items: [
          {
            exerciseId,
            plannedSets: 3,
            plannedReps: 10,
            order: 0,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      clientId,
      gymId,
      comment: 'E2E создание тренировки',
      status: 'PLANNED',
    });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      exercise: expect.objectContaining({ id: exerciseId }),
      plannedSets: 3,
      plannedReps: 10,
    });
  });
});
