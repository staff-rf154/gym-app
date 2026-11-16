import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000701';
const TRAINER_PHONE = '+79990000702';
const OTHER_TRAINER_PHONE = '+79990000703';
const CLIENT_PHONE = '+79990000710';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Reports Gym';
const EXERCISE_PREFIX = 'E2E Report Exercise';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerUserId: string;
  let otherTrainerUserId: string;
  let clientUserId: string;
  let clientId: string;
  let trainerId: string;
  let otherTrainerId: string;
  let gymId: string;
  let exerciseId: string;
  let secondExerciseId: string;
  let trainerToken: string;
  let otherTrainerToken: string;
  let clientToken: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
        let size = 0;
        const stream = res as unknown as { destroy: (error?: Error) => void };

        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_UPLOAD_BYTES) {
            stream.destroy(new Error('PDF response is too large'));
            return;
          }
          chunks.push(chunk);
        });
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

    const phones = [
      ADMIN_PHONE,
      TRAINER_PHONE,
      OTHER_TRAINER_PHONE,
      CLIENT_PHONE,
    ];

    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { client: { user: { phone: CLIENT_PHONE } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { client: { user: { phone: CLIENT_PHONE } } } },
    });
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.weightMeasurement.deleteMany({
      where: { client: { user: { phone: CLIENT_PHONE } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { trainer: { user: { phone: { in: phones } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: CLIENT_PHONE } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.exercise.deleteMany({
      where: { name: { startsWith: EXERCISE_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const admin = await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Администратор',
      },
    });
    adminId = admin.id;

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер',
      },
    });
    trainerUserId = trainerUser.id;
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUser.id } })
    ).id;

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер',
      },
    });
    otherTrainerUserId = otherTrainerUser.id;
    otherTrainerId = (
      await prisma.trainer.create({ data: { userId: otherTrainerUser.id } })
    ).id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент',
      },
    });
    clientUserId = clientUser.id;
    clientId = (
      await prisma.client.create({ data: { userId: clientUser.id } })
    ).id;

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Отчётная, 1' },
      })
    ).id;

    await prisma.trainerGym.create({
      data: { trainerId, gymId },
    });

    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId },
    });

    exerciseId = (
      await prisma.exercise.create({
        data: {
          name: `${EXERCISE_PREFIX} Жим`,
          type: 'FREE_WEIGHT',
          requiresEquipment: true,
        },
      })
    ).id;
    secondExerciseId = (
      await prisma.exercise.create({
        data: {
          name: `${EXERCISE_PREFIX} Присед`,
          type: 'BODYWEIGHT',
          requiresEquipment: false,
        },
      })
    ).id;

    await prisma.weightMeasurement.createMany({
      data: [
        {
          clientId,
          measuredBy: trainerUserId,
          measuredAt: new Date('2026-11-01T10:00:00.000Z'),
          weight: 80,
          fatMass: 20,
        },
        {
          clientId,
          measuredBy: trainerUserId,
          measuredAt: new Date('2026-11-05T10:00:00.000Z'),
          weight: 79,
          fatMass: 19,
        },
      ],
    });

    await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId,
        date: new Date('2026-11-01'),
        items: {
          create: [
            {
              exerciseId,
              plannedWeight: 50,
              plannedSets: 3,
              plannedReps: 8,
              order: 1,
              result: {
                create: {
                  done: true,
                  actualWeight: 55,
                  actualReps: 8,
                },
              },
            },
            {
              exerciseId: secondExerciseId,
              plannedWeight: 30,
              plannedSets: 3,
              plannedReps: 10,
              order: 2,
            },
          ],
        },
      },
    });

    await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId,
        date: new Date('2026-11-05'),
        items: {
          create: [
            {
              exerciseId,
              plannedWeight: 60,
              plannedSets: 3,
              plannedReps: 8,
              order: 1,
            },
          ],
        },
      },
    });

    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { clientId } } },
    });
    await prisma.workoutItem.deleteMany({ where: { workout: { clientId } } });
    await prisma.workout.deleteMany({ where: { clientId } });
    await prisma.weightMeasurement.deleteMany({ where: { clientId } });
    await prisma.clientTrainer.deleteMany({ where: { clientId } });
    await prisma.trainerGym.deleteMany({
      where: { trainerId: { in: [trainerId, otherTrainerId] } },
    });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.trainer.deleteMany({
      where: { id: { in: [trainerId, otherTrainerId] } },
    });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.exercise.deleteMany({
      where: { name: { startsWith: EXERCISE_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: [adminId, trainerUserId, otherTrainerUserId, clientUserId],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [adminId, trainerUserId, otherTrainerUserId, clientUserId],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /reports/weight-dynamics клиентом (без client_id) → точки по возрастанию', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/weight-dynamics',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({ weight: 80, fatMass: 20 });
    expect(response.body[1]).toMatchObject({ weight: 79, fatMass: 19 });
  });

  it('GET /reports/weight-dynamics с фильтром from/to', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/weight-dynamics?from=2026-11-04&to=2026-11-06',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].weight).toBe(79);
  });

  it('тренер без client_id → 400', async () => {
    const response = await authedGet(
      trainerToken,
      '/reports/weight-dynamics',
    );

    expect(response.status).toBe(400);
  });

  it('привязанный тренер с client_id → 200', async () => {
    const response = await authedGet(
      trainerToken,
      `/reports/weight-dynamics?client_id=${clientId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('непривязанный тренер → 403', async () => {
    const response = await authedGet(
      otherTrainerToken,
      `/reports/weight-dynamics?client_id=${clientId}`,
    );

    expect(response.status).toBe(403);
  });

  it('exercise-progress без exercise_id → 400', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/exercise-progress',
    );

    expect(response.status).toBe(400);
  });

  it('exercise-progress несуществующего упражнения → 404', async () => {
    const response = await authedGet(
      clientToken,
      `/reports/exercise-progress?exercise_id=${MISSING_ID}`,
    );

    expect(response.status).toBe(404);
  });

  it('exercise-progress: fallback план→факт', async () => {
    const response = await authedGet(
      clientToken,
      `/reports/exercise-progress?exercise_id=${exerciseId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.exercise.id).toBe(exerciseId);
    expect(response.body.points).toHaveLength(2);

    expect(response.body.points[0]).toMatchObject({
      date: '2026-11-01',
      plannedWeight: 50,
      actualWeight: 55,
      plannedReps: 8,
      actualReps: 8,
      done: true,
      isActualFallback: false,
    });

    expect(response.body.points[1]).toMatchObject({
      date: '2026-11-05',
      plannedWeight: 60,
      actualWeight: 60,
      plannedReps: 8,
      actualReps: 8,
      done: false,
      isActualFallback: true,
    });
  });

  it('exercises-summary: firstWeight/lastWeight/recordsCount', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/exercises-summary',
    );

    expect(response.status).toBe(200);

    const first = response.body.find(
      (item: { exerciseId: string }) => item.exerciseId === exerciseId,
    );
    expect(first).toMatchObject({
      exerciseName: `${EXERCISE_PREFIX} Жим`,
      firstWeight: 55,
      lastWeight: 60,
      recordsCount: 2,
    });

    const second = response.body.find(
      (item: { exerciseId: string }) => item.exerciseId === secondExerciseId,
    );
    expect(second).toMatchObject({
      exerciseName: `${EXERCISE_PREFIX} Присед`,
      firstWeight: 30,
      lastWeight: 30,
      recordsCount: 1,
    });
  });

  it('GET /reports/pdf/weight клиентом → application/pdf', async () => {
    const response = await authedGetPdf(
      clientToken,
      '/reports/pdf/weight?period=month',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'weight-report.pdf',
    );
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/weight без period → неделя по умолчанию', async () => {
    const response = await authedGetPdf(clientToken, '/reports/pdf/weight');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/exercises тренером с client_id → application/pdf', async () => {
    const response = await authedGetPdf(
      trainerToken,
      `/reports/pdf/exercises?client_id=${clientId}&period=month`,
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'exercises-report.pdf',
    );
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/weight тренером без client_id → 400', async () => {
    const response = await authedGetPdf(
      trainerToken,
      '/reports/pdf/weight?period=month',
    );

    expect(response.status).toBe(400);
  });

  it('GET /reports/pdf/exercises непривязанным тренером → 403', async () => {
    const response = await authedGetPdf(
      otherTrainerToken,
      `/reports/pdf/exercises?client_id=${clientId}&period=month`,
    );

    expect(response.status).toBe(403);
  });

  it('exercise-progress с фильтром from/to → только точки периода', async () => {
    const response = await authedGet(
      clientToken,
      `/reports/exercise-progress?exercise_id=${exerciseId}&from=2026-11-01&to=2026-11-01`,
    );

    expect(response.status).toBe(200);
    expect(response.body.points).toHaveLength(1);
    expect(response.body.points[0].date).toBe('2026-11-01');
  });

  it('exercises-summary с фильтром from/to → только записи периода', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/exercises-summary?from=2026-11-01&to=2026-11-01',
    );

    expect(response.status).toBe(200);
    const first = response.body.find(
      (item: { exerciseId: string }) => item.exerciseId === exerciseId,
    );
    expect(first).toMatchObject({ firstWeight: 55, lastWeight: 55 });
  });

  it('GET /reports/pdf/weight с period=previousWeek → application/pdf', async () => {
    const response = await authedGetPdf(
      clientToken,
      '/reports/pdf/weight?period=previousWeek',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/attendance → application/pdf', async () => {
    const response = await authedGetPdf(
      trainerToken,
      `/reports/pdf/attendance?period=month&gym_id=${gymId}`,
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'attendance-report.pdf',
    );
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/equipment → application/pdf', async () => {
    const response = await authedGetPdf(
      trainerToken,
      '/reports/pdf/equipment?period=month',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'equipment-report.pdf',
    );
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/trainers → application/pdf', async () => {
    const response = await authedGetPdf(
      trainerToken,
      '/reports/pdf/trainers?period=month',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'trainers-report.pdf',
    );
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('GET /reports/pdf/weight с некорректным period → 400', async () => {
    const response = await authedGetPdf(
      clientToken,
      '/reports/pdf/weight?period=decade',
    );

    expect(response.status).toBe(400);
  });
});
