import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000801';
const RECEPTION_PHONE = '+79990000802';
const TRAINER_PHONE = '+79990000803';
const OTHER_TRAINER_PHONE = '+79990000804';
const CLIENT_PHONE = '+79990000805';
const OTHER_CLIENT_PHONE = '+79990000806';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Attendance Gym';
const OTHER_GYM_NAME = 'E2E Attendance Other Gym';

describe('Reports attendance (e2e)', () => {
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
  let otherTrainerToken: string;
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
        name: 'E2E Attendance Admin',
      },
    });

    const receptionUser = await prisma.user.create({
      data: {
        phone: RECEPTION_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Attendance Reception',
      },
    });

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Посещаемая, 1' },
      })
    ).id;
    otherGymId = (
      await prisma.gym.create({
        data: { name: OTHER_GYM_NAME, address: 'ул. Чужая, 2' },
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
        name: 'E2E Attendance Trainer',
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
        name: 'E2E Attendance Other Trainer',
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
        name: 'E2E Attendance Client',
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
        name: 'E2E Attendance Other Client',
      },
    });
    otherClientId = (
      await prisma.client.create({ data: { userId: otherClientUser.id } })
    ).id;

    await prisma.clientGym.createMany({
      data: [
        { clientId, gymId },
        { clientId: otherClientId, gymId },
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
        {
          clientId: otherClientId,
          trainerId: otherTrainerId,
          gymId: otherGymId,
        },
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

    await workout('2027-10-01', WorkoutStatus.COMPLETED, clientId, trainerId, gymId);
    await workout('2027-10-02', WorkoutStatus.COMPLETED, clientId, trainerId, gymId);
    await workout(
      '2027-10-08',
      WorkoutStatus.COMPLETED,
      otherClientId,
      trainerId,
      gymId,
    );
    await workout(
      '2027-10-08',
      WorkoutStatus.MISSED,
      otherClientId,
      trainerId,
      gymId,
    );
    await workout(
      '2027-10-09',
      WorkoutStatus.COMPLETED,
      otherClientId,
      otherTrainerId,
      otherGymId,
    );
    await workout(
      '2027-10-15',
      WorkoutStatus.PLANNED,
      clientId,
      otherTrainerId,
      otherGymId,
    );

    adminToken = await login(ADMIN_PHONE);
    receptionToken = await login(RECEPTION_PHONE);
    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
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

  it('ADMIN: общая посещаемость, skipped/planned не учитываются', async () => {
    const response = await authedGet(
      adminToken,
      '/reports/attendance?from=2027-10-01&to=2027-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body.totalVisits).toBe(4);
    expect(response.body.uniqueClients).toBe(2);
    expect(response.body.dynamics).toHaveLength(4);

    const oct8 = response.body.dynamics.find(
      (point: { period: string }) => point.period === '2027-10-08',
    );
    expect(oct8).toMatchObject({ visits: 1, uniqueClients: 1 });

    const client = response.body.byClient.find(
      (item: { clientId: string }) => item.clientId === clientId,
    );
    expect(client).toMatchObject({
      visits: 2,
      lastVisitDate: '2027-10-02',
    });
  });

  it('ADMIN: группировка по неделям и месяцам', async () => {
    const weekly = await authedGet(
      adminToken,
      '/reports/attendance?from=2027-10-01&to=2027-10-31&group_by=week',
    );

    expect(weekly.status).toBe(200);
    expect(weekly.body.dynamics).toHaveLength(2);
    expect(weekly.body.dynamics[0]).toMatchObject({
      period: '2027-09-27',
      visits: 2,
    });

    const monthly = await authedGet(
      adminToken,
      '/reports/attendance?from=2027-10-01&to=2027-10-31&group_by=month',
    );

    expect(monthly.status).toBe(200);
    expect(monthly.body.dynamics).toEqual([
      { period: '2027-10', visits: 4, uniqueClients: 2 },
    ]);
  });

  it('ADMIN: фильтры по залу, тренеру и клиенту', async () => {
    const byGym = await authedGet(
      adminToken,
      `/reports/attendance?from=2027-10-01&to=2027-10-31&gym_id=${gymId}`,
    );
    expect(byGym.body.totalVisits).toBe(3);

    const byTrainer = await authedGet(
      adminToken,
      `/reports/attendance?from=2027-10-01&to=2027-10-31&trainer_id=${trainerId}`,
    );
    expect(byTrainer.body.totalVisits).toBe(3);

    const byClient = await authedGet(
      adminToken,
      `/reports/attendance?from=2027-10-01&to=2027-10-31&client_id=${clientId}`,
    );
    expect(byClient.body.totalVisits).toBe(2);
  });

  it('RECEPTION: видит только свой зал', async () => {
    const response = await authedGet(
      receptionToken,
      '/reports/attendance?from=2027-10-01&to=2027-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body.totalVisits).toBe(3);
    expect(response.body.uniqueClients).toBe(2);

    const filtered = await authedGet(
      receptionToken,
      `/reports/attendance?from=2027-10-01&to=2027-10-31&client_id=${clientId}`,
    );
    expect(filtered.body.totalVisits).toBe(2);
  });

  it('RECEPTION: чужой зал → 403', async () => {
    const response = await authedGet(
      receptionToken,
      `/reports/attendance?gym_id=${otherGymId}`,
    );

    expect(response.status).toBe(403);
  });

  it('TRAINER: только свои тренировки и свои клиенты', async () => {
    const response = await authedGet(
      trainerToken,
      '/reports/attendance?from=2027-10-01&to=2027-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body.totalVisits).toBe(3);
    expect(response.body.uniqueClients).toBe(2);
    expect(
      response.body.byClient.every(
        (item: { clientId: string }) =>
          item.clientId === clientId || item.clientId === otherClientId,
      ),
    ).toBe(true);

    const ownGym = await authedGet(
      trainerToken,
      `/reports/attendance?from=2027-10-01&to=2027-10-31&gym_id=${gymId}`,
    );
    expect(ownGym.status).toBe(200);

    const foreignGym = await authedGet(
      trainerToken,
      `/reports/attendance?gym_id=${otherGymId}`,
    );
    expect(foreignGym.status).toBe(403);
  });

  it('TRAINER: чужой trainer_id → 403', async () => {
    const response = await authedGet(
      trainerToken,
      `/reports/attendance?trainer_id=${otherTrainerId}`,
    );

    expect(response.status).toBe(403);
  });

  it('ADMIN без периода → 400', async () => {
    const response = await authedGet(adminToken, '/reports/attendance');

    expect(response.status).toBe(400);
  });

  it('CLIENT не имеет доступа к отчёту посещаемости', async () => {
    const response = await authedGet(clientToken, '/reports/attendance');
    expect(response.status).toBe(403);
  });
});
