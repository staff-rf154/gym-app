import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NutritionType, Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_A_PHONE = '+79990002401';
const TRAINER_B_PHONE = '+79990002402';
const CLIENT_PHONE = '+79990002403';
const RECEPTION_A_PHONE = '+79990002404';
const RECEPTION_B_PHONE = '+79990002405';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  TRAINER_A_PHONE,
  TRAINER_B_PHONE,
  CLIENT_PHONE,
  RECEPTION_A_PHONE,
  RECEPTION_B_PHONE,
];
const GYM_A_NAME = 'E2E Isolation Gym A';
const GYM_B_NAME = 'E2E Isolation Gym B';
const EXERCISE_NAME = 'E2E Isolation Exercise';

describe('Data isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerAUserId: string;
  let trainerBUserId: string;
  let clientUserId: string;
  let trainerAId: string;
  let trainerBId: string;
  let clientId: string;
  let gymAId: string;
  let gymBId: string;
  let exerciseId: string;
  let trainerAToken: string;
  let trainerBToken: string;
  let clientToken: string;
  let receptionAToken: string;
  let receptionBToken: string;

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

  const authedGetPdf = (token: string, path: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}${path}`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
        res.on('error', (error: Error) => callback(error, Buffer.alloc(0)));
      });

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

    await prisma.nutritionRecommendation.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.weightMeasurement.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { client: { user: { phone: CLIENT_PHONE } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { client: { user: { phone: CLIENT_PHONE } } } },
    });
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: CLIENT_PHONE } },
    });
    await prisma.reception.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({
      where: { name: { in: [GYM_A_NAME, GYM_B_NAME] } },
    });
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerAUser = await prisma.user.create({
      data: {
        phone: TRAINER_A_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер A',
        timezone: 'Europe/Moscow',
      },
    });
    trainerAUserId = trainerAUser.id;
    trainerAId = (
      await prisma.trainer.create({ data: { userId: trainerAUser.id } })
    ).id;

    const trainerBUser = await prisma.user.create({
      data: {
        phone: TRAINER_B_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер B',
        timezone: 'Europe/Moscow',
      },
    });
    trainerBUserId = trainerBUser.id;
    trainerBId = (
      await prisma.trainer.create({ data: { userId: trainerBUser.id } })
    ).id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент изоляции',
        timezone: 'Europe/Moscow',
      },
    });
    clientUserId = clientUser.id;
    clientId = (
      await prisma.client.create({ data: { userId: clientUser.id } })
    ).id;

    gymAId = (
      await prisma.gym.create({
        data: { name: GYM_A_NAME, address: 'ул. A, 1' },
      })
    ).id;
    gymBId = (
      await prisma.gym.create({
        data: { name: GYM_B_NAME, address: 'ул. B, 1' },
      })
    ).id;

    await prisma.clientTrainer.createMany({
      data: [
        { clientId, trainerId: trainerAId, gymId: gymAId },
        { clientId, trainerId: trainerBId, gymId: gymBId },
      ],
    });
    await prisma.clientGym.create({ data: { clientId, gymId: gymAId } });

    const receptionAUser = await prisma.user.create({
      data: {
        phone: RECEPTION_A_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Ресепшен A',
        timezone: 'Europe/Moscow',
      },
    });
    await prisma.reception.create({
      data: { userId: receptionAUser.id, gymId: gymAId },
    });

    const receptionBUser = await prisma.user.create({
      data: {
        phone: RECEPTION_B_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Ресепшен B',
        timezone: 'Europe/Moscow',
      },
    });
    await prisma.reception.create({
      data: { userId: receptionBUser.id, gymId: gymBId },
    });

    exerciseId = (
      await prisma.exercise.create({
        data: { name: EXERCISE_NAME, type: 'FREE_WEIGHT' },
      })
    ).id;

    await prisma.weightMeasurement.createMany({
      data: [
        {
          clientId,
          measuredBy: trainerAUserId,
          measuredAt: new Date('2026-11-01T10:00:00.000Z'),
          weight: 80,
          fatMass: 20,
        },
        {
          clientId,
          measuredBy: trainerBUserId,
          measuredAt: new Date('2026-11-02T10:00:00.000Z'),
          weight: 70,
          fatMass: 15,
        },
      ],
    });

    await prisma.workout.create({
      data: {
        clientId,
        trainerId: trainerAId,
        gymId: gymAId,
        date: new Date('2026-11-01'),
        status: WorkoutStatus.COMPLETED,
        items: {
          create: [
            {
              exerciseId,
              plannedWeight: 50,
              plannedSets: 3,
              plannedReps: 8,
              order: 1,
              result: {
                create: { done: true, actualWeight: 52, actualReps: 8 },
              },
            },
          ],
        },
      },
    });

    await prisma.workout.create({
      data: {
        clientId,
        trainerId: trainerBId,
        gymId: gymBId,
        date: new Date('2026-11-02'),
        status: WorkoutStatus.COMPLETED,
        items: {
          create: [
            {
              exerciseId,
              plannedWeight: 70,
              plannedSets: 3,
              plannedReps: 8,
              order: 1,
              result: {
                create: { done: true, actualWeight: 72, actualReps: 8 },
              },
            },
          ],
        },
      },
    });

    await prisma.nutritionRecommendation.createMany({
      data: [
        {
          clientId,
          trainerId: trainerAId,
          type: NutritionType.DAILY,
          kcal: 2200,
          comment: 'Питание тренера A',
        },
        {
          clientId,
          trainerId: trainerBId,
          type: NutritionType.DAILY,
          kcal: 1800,
          comment: 'Питание тренера B',
        },
      ],
    });

    trainerAToken = await login(TRAINER_A_PHONE);
    trainerBToken = await login(TRAINER_B_PHONE);
    clientToken = await login(CLIENT_PHONE);
    receptionAToken = await login(RECEPTION_A_PHONE);
    receptionBToken = await login(RECEPTION_B_PHONE);
  });

  afterAll(async () => {
    await prisma.nutritionRecommendation.deleteMany({
      where: { clientId },
    });
    await prisma.weightMeasurement.deleteMany({ where: { clientId } });
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { clientId } } },
    });
    await prisma.workoutItem.deleteMany({ where: { workout: { clientId } } });
    await prisma.workout.deleteMany({ where: { clientId } });
    await prisma.clientTrainer.deleteMany({ where: { clientId } });
    await prisma.clientGym.deleteMany({ where: { clientId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.reception.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { id: { in: [trainerAId, trainerBId] } },
    });
    await prisma.gym.deleteMany({ where: { id: { in: [gymAId, gymBId] } } });
    await prisma.exercise.deleteMany({ where: { id: exerciseId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('тренер A видит только свои замеры веса', async () => {
    const response = await authedGet(
      trainerAToken,
      `/reports/weight-dynamics?client_id=${clientId}&from=2026-11-01&to=2026-11-30`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ weight: 80, fatMass: 20 });
  });

  it('тренер B видит только свои замеры веса', async () => {
    const response = await authedGet(
      trainerBToken,
      `/reports/weight-dynamics?client_id=${clientId}&from=2026-11-01&to=2026-11-30`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ weight: 70, fatMass: 15 });
  });

  it('клиент видит замеры обоих тренеров', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/weight-dynamics?from=2026-11-01&to=2026-11-30',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('тренер A видит только свои тренировки в прогрессе упражнения', async () => {
    const response = await authedGet(
      trainerAToken,
      `/reports/exercise-progress?client_id=${clientId}&exercise_id=${exerciseId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.points).toHaveLength(1);
    expect(response.body.points[0]).toMatchObject({
      date: '2026-11-01',
      actualWeight: 52,
    });
  });

  it('тренер B видит только свои тренировки в прогрессе упражнения', async () => {
    const response = await authedGet(
      trainerBToken,
      `/reports/exercise-progress?client_id=${clientId}&exercise_id=${exerciseId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.points).toHaveLength(1);
    expect(response.body.points[0]).toMatchObject({
      date: '2026-11-02',
      actualWeight: 72,
    });
  });

  it('тренер A видит только своё питание клиента', async () => {
    const response = await authedGet(
      trainerAToken,
      `/trainer/nutrition?client_id=${clientId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].comment).toBe('Питание тренера A');
  });

  it('тренер B видит только своё питание клиента', async () => {
    const response = await authedGet(
      trainerBToken,
      `/trainer/nutrition?client_id=${clientId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].comment).toBe('Питание тренера B');
  });

  it('клиент видит питание обоих тренеров', async () => {
    const response = await authedGet(clientToken, '/client/nutrition');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('RECEPTION своего зала может скачать PDF клиента в табличной форме', async () => {
    const response = await authedGetPdf(
      receptionAToken,
      `/reports/pdf/weight?client_id=${clientId}&from=2026-11-01&to=2026-11-30`,
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'weight-report.pdf',
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('RECEPTION чужого зала получает 403 на PDF клиента', async () => {
    const response = await authedGetPdf(
      receptionBToken,
      `/reports/pdf/weight?client_id=${clientId}&from=2026-11-01&to=2026-11-30`,
    );

    expect(response.status).toBe(403);
    const body = JSON.parse((response.body as Buffer).toString()) as {
      message: string;
    };
    expect(body.message).toContain('not active in your gym');
  });

  it('тренер A может скачать PDF по своим данным', async () => {
    const response = await authedGetPdf(
      trainerAToken,
      `/reports/pdf/exercises?client_id=${clientId}&from=2026-11-01&to=2026-11-30`,
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
  });

  it('тренер B не получает доступ к клиенту чужого тренера', async () => {
    await prisma.clientTrainer.updateMany({
      where: { clientId, trainerId: trainerBId },
      data: { isActive: false },
    });

    const response = await authedGet(
      trainerBToken,
      `/reports/weight-dynamics?client_id=${clientId}`,
    );

    expect(response.status).toBe(403);

    await prisma.clientTrainer.updateMany({
      where: { clientId, trainerId: trainerBId },
      data: { isActive: true },
    });
  });
});
