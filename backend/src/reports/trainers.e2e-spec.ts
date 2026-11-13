import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000651';
const RECEPTION_PHONE = '+79990000652';
const TRAINER_PHONE = '+79990000653';
const OTHER_TRAINER_PHONE = '+79990000654';
const CLIENT_PHONE = '+79990000655';
const OTHER_CLIENT_PHONE = '+79990000656';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Trainers Gym';
const OTHER_GYM_NAME = 'E2E Trainers Other Gym';

describe('Reports trainers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gymId: string;
  let otherGymId: string;
  let clientId: string;
  let otherClientId: string;
  let trainerId: string;
  let otherTrainerId: string;
  let adminToken: string;
  let receptionToken: string;
  let trainerToken: string;
  let clientToken: string;

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
      RECEPTION_PHONE,
      TRAINER_PHONE,
      OTHER_TRAINER_PHONE,
      CLIENT_PHONE,
      OTHER_CLIENT_PHONE,
    ];

    await prisma.workout.deleteMany({
      where: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } },
    });
    await prisma.clientGym.deleteMany({
      where: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } },
    });
    await prisma.reception.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.gym.deleteMany({
      where: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: phones } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Trainers Admin',
      },
    });

    const receptionUser = await prisma.user.create({
      data: {
        phone: RECEPTION_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Trainers Reception',
      },
    });

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Тренерская, 1' },
      })
    ).id;
    otherGymId = (
      await prisma.gym.create({
        data: { name: OTHER_GYM_NAME, address: 'ул. Чужая, 4' },
      })
    ).id;

    await prisma.reception.create({
      data: { userId: receptionUser.id, gymId },
    });

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Trainers Trainer',
      },
    });
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUser.id } })
    ).id;

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Trainers Other Trainer',
      },
    });
    otherTrainerId = (
      await prisma.trainer.create({ data: { userId: otherTrainerUser.id } })
    ).id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Trainers Client',
      },
    });
    clientId = (
      await prisma.client.create({ data: { userId: clientUser.id } })
    ).id;

    const otherClientUser = await prisma.user.create({
      data: {
        phone: OTHER_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Trainers Other Client',
      },
    });
    otherClientId = (
      await prisma.client.create({ data: { userId: otherClientUser.id } })
    ).id;

    await prisma.clientGym.createMany({
      data: [
        { clientId, gymId },
        { clientId: otherClientId, gymId },
        { clientId, gymId: otherGymId },
      ],
    });
    await prisma.trainerGym.createMany({
      data: [
        { trainerId, gymId },
        { trainerId: otherTrainerId, gymId: otherGymId },
      ],
    });
    await prisma.clientTrainer.createMany({
      data: [
        { clientId, trainerId, gymId },
        { clientId: otherClientId, trainerId, gymId },
        { clientId, trainerId: otherTrainerId, gymId: otherGymId },
      ],
    });

    const workout = (
      date: string,
      status: WorkoutStatus,
      workoutClientId: string,
      workoutTrainerId: string,
      workoutGymId: string,
    ) =>
      prisma.workout.create({
        data: {
          date: new Date(date),
          status,
          clientId: workoutClientId,
          trainerId: workoutTrainerId,
          gymId: workoutGymId,
        },
      });

    await workout('2026-10-01', WorkoutStatus.DONE, clientId, trainerId, gymId);
    await workout(
      '2026-10-02',
      WorkoutStatus.DONE,
      otherClientId,
      trainerId,
      gymId,
    );
    await workout('2026-10-03', WorkoutStatus.DONE, clientId, trainerId, gymId);
    await workout(
      '2026-10-04',
      WorkoutStatus.DONE,
      clientId,
      otherTrainerId,
      otherGymId,
    );
    await workout(
      '2026-10-05',
      WorkoutStatus.SKIPPED,
      clientId,
      trainerId,
      gymId,
    );

    adminToken = await login(ADMIN_PHONE);
    receptionToken = await login(RECEPTION_PHONE);
    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.workout.deleteMany({
      where: { gymId: { in: [gymId, otherGymId] } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { gymId: { in: [gymId, otherGymId] } },
    });
    await prisma.trainerGym.deleteMany({
      where: { gymId: { in: [gymId, otherGymId] } },
    });
    await prisma.clientGym.deleteMany({
      where: { gymId: { in: [gymId, otherGymId] } },
    });
    await prisma.reception.deleteMany({ where: { gymId } });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.trainer.deleteMany({
      where: { id: { in: [trainerId, otherTrainerId] } },
    });
    await prisma.gym.deleteMany({ where: { id: { in: [gymId, otherGymId] } } });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          phone: {
            in: [
              ADMIN_PHONE,
              RECEPTION_PHONE,
              TRAINER_PHONE,
              OTHER_TRAINER_PHONE,
              CLIENT_PHONE,
              OTHER_CLIENT_PHONE,
            ],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        phone: {
          in: [
            ADMIN_PHONE,
            RECEPTION_PHONE,
            TRAINER_PHONE,
            OTHER_TRAINER_PHONE,
            CLIENT_PHONE,
            OTHER_CLIENT_PHONE,
          ],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('ADMIN: посещения и уникальные клиенты по тренерам', async () => {
    const response = await authedGet(
      adminToken,
      '/reports/trainers?from=2026-10-01&to=2026-10-31',
    );

    expect(response.status).toBe(200);

    const trainer = response.body.find(
      (item: { trainerId: string }) => item.trainerId === trainerId,
    );
    expect(trainer).toMatchObject({
      trainerName: 'E2E Trainers Trainer',
      visits: 3,
      uniqueClients: 2,
    });
    expect(trainer.clients).toHaveLength(2);

    const otherTrainer = response.body.find(
      (item: { trainerId: string }) => item.trainerId === otherTrainerId,
    );
    expect(otherTrainer).toMatchObject({ visits: 1, uniqueClients: 1 });
  });

  it('ADMIN: фильтры по залу и тренеру', async () => {
    const byGym = await authedGet(
      adminToken,
      `/reports/trainers?from=2026-10-01&to=2026-10-31&gym_id=${gymId}`,
    );
    expect(byGym.status).toBe(200);
    expect(byGym.body).toHaveLength(1);
    expect(byGym.body[0].trainerId).toBe(trainerId);

    const byTrainer = await authedGet(
      adminToken,
      `/reports/trainers?from=2026-10-01&to=2026-10-31&trainer_id=${otherTrainerId}`,
    );
    expect(byTrainer.status).toBe(200);
    expect(byTrainer.body).toHaveLength(1);
    expect(byTrainer.body[0].trainerId).toBe(otherTrainerId);
  });

  it('RECEPTION: только тренеры своего зала', async () => {
    const response = await authedGet(
      receptionToken,
      '/reports/trainers?from=2026-10-01&to=2026-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      trainerId,
      visits: 3,
    });
  });

  it('RECEPTION: чужой зал и чужой тренер → 403', async () => {
    const foreignGym = await authedGet(
      receptionToken,
      `/reports/trainers?from=2026-10-01&to=2026-10-31&gym_id=${otherGymId}`,
    );
    expect(foreignGym.status).toBe(403);

    const foreignTrainer = await authedGet(
      receptionToken,
      `/reports/trainers?from=2026-10-01&to=2026-10-31&trainer_id=${otherTrainerId}`,
    );
    expect(foreignTrainer.status).toBe(403);
  });

  it('TRAINER: видит только себя', async () => {
    const response = await authedGet(
      trainerToken,
      '/reports/trainers?from=2026-10-01&to=2026-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      trainerId,
      visits: 3,
      uniqueClients: 2,
    });

    const foreign = await authedGet(
      trainerToken,
      `/reports/trainers?from=2026-10-01&to=2026-10-31&trainer_id=${otherTrainerId}`,
    );
    expect(foreign.status).toBe(403);
  });

  it('ADMIN без периода → 400', async () => {
    const response = await authedGet(adminToken, '/reports/trainers');

    expect(response.status).toBe(400);
  });

  it('CLIENT не имеет доступа к отчёту по тренерам', async () => {
    const response = await authedGet(clientToken, '/reports/trainers');
    expect(response.status).toBe(403);
  });
});
