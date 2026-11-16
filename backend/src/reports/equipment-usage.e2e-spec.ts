import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GymEquipmentType,
  Role,
  WorkoutStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000751';
const RECEPTION_PHONE = '+79990000752';
const TRAINER_PHONE = '+79990000753';
const OTHER_TRAINER_PHONE = '+79990000754';
const CLIENT_PHONE = '+79990000755';
const OTHER_CLIENT_PHONE = '+79990000756';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Usage Gym';
const OTHER_GYM_NAME = 'E2E Usage Other Gym';
const EXERCISE_NAME = 'E2E Usage Exercise';

describe('Reports equipment usage (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gymId: string;
  let otherGymId: string;
  let treadmillId: string;
  let benchId: string;
  let machineId: string;
  let exerciseId: string;
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

    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { gym: { name: { in: [GYM_NAME, OTHER_GYM_NAME] } } } },
    });
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
    await prisma.gymEquipment.deleteMany({
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
    await prisma.exercise.deleteMany({ where: { name: EXERCISE_NAME } });
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
        name: 'E2E Usage Admin',
      },
    });

    const receptionUser = await prisma.user.create({
      data: {
        phone: RECEPTION_PHONE,
        passwordHash,
        role: Role.RECEPTION,
        name: 'E2E Usage Reception',
      },
    });

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Тренажёрная, 1' },
      })
    ).id;
    otherGymId = (
      await prisma.gym.create({
        data: { name: OTHER_GYM_NAME, address: 'ул. Чужая, 3' },
      })
    ).id;

    await prisma.reception.create({
      data: { userId: receptionUser.id, gymId },
    });

    treadmillId = (
      await prisma.gymEquipment.create({
        data: {
          gymId,
          name: 'E2E Treadmill',
          type: GymEquipmentType.CARDIO,
        },
      })
    ).id;
    benchId = (
      await prisma.gymEquipment.create({
        data: {
          gymId,
          name: 'E2E Bench',
          type: GymEquipmentType.FREE_WEIGHT,
        },
      })
    ).id;
    machineId = (
      await prisma.gymEquipment.create({
        data: {
          gymId: otherGymId,
          name: 'E2E Machine',
          type: GymEquipmentType.MACHINE,
        },
      })
    ).id;

    exerciseId = (
      await prisma.exercise.create({
        data: {
          name: EXERCISE_NAME,
          type: 'BODYWEIGHT',
          requiresEquipment: false,
        },
      })
    ).id;

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Usage Trainer',
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
        name: 'E2E Usage Other Trainer',
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
        name: 'E2E Usage Client',
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
        name: 'E2E Usage Other Client',
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
      ],
    });

    const createWorkout = async (
      date: string,
      status: WorkoutStatus,
      workoutClientId: string,
      workoutTrainerId: string,
      workoutGymId: string,
      equipmentIds: (string | null)[],
    ) => {
      const workout = await prisma.workout.create({
        data: {
          date: new Date(date),
          status,
          clientId: workoutClientId,
          trainerId: workoutTrainerId,
          gymId: workoutGymId,
        },
      });

      await prisma.workoutItem.createMany({
        data: equipmentIds.map((equipmentId, index) => ({
          workoutId: workout.id,
          exerciseId,
          equipmentId,
          plannedSets: 3,
          plannedReps: 10,
          order: index + 1,
        })),
      });
    };

    await createWorkout(
      '2027-10-01',
      WorkoutStatus.COMPLETED,
      clientId,
      trainerId,
      gymId,
      [treadmillId, benchId],
    );
    await createWorkout(
      '2027-10-02',
      WorkoutStatus.COMPLETED,
      otherClientId,
      trainerId,
      gymId,
      [treadmillId],
    );
    await createWorkout(
      '2027-10-03',
      WorkoutStatus.COMPLETED,
      clientId,
      otherTrainerId,
      otherGymId,
      [machineId],
    );
    await createWorkout(
      '2027-10-04',
      WorkoutStatus.MISSED,
      clientId,
      trainerId,
      gymId,
      [treadmillId],
    );
    await createWorkout(
      '2027-10-05',
      WorkoutStatus.COMPLETED,
      clientId,
      trainerId,
      gymId,
      [null],
    );

    adminToken = await login(ADMIN_PHONE);
    receptionToken = await login(RECEPTION_PHONE);
    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { gymId: { in: [gymId, otherGymId] } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { gymId: { in: [gymId, otherGymId] } } },
    });
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
    await prisma.gymEquipment.deleteMany({
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
    await prisma.exercise.deleteMany({ where: { id: exerciseId } });
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

  it('ADMIN: сводка по типам, тренажёрам и клиентам', async () => {
    const response = await authedGet(
      adminToken,
      '/reports/equipment-usage?from=2027-10-01&to=2027-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body.totalUsage).toBe(4);
    expect(response.body.byType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CARDIO',
          usageCount: 2,
          uniqueClients: 2,
          share: 0.5,
        }),
        expect.objectContaining({ type: 'FREE_WEIGHT', usageCount: 1 }),
        expect.objectContaining({ type: 'MACHINE', usageCount: 1 }),
      ]),
    );

    expect(response.body.mostUsed).toMatchObject({
      equipmentId: treadmillId,
      usageCount: 2,
    });

    const bench = response.body.byEquipment.find(
      (item: { equipmentId: string }) => item.equipmentId === benchId,
    );
    expect(bench).toMatchObject({
      equipmentName: 'E2E Bench',
      type: 'FREE_WEIGHT',
      usageCount: 1,
      uniqueClients: 1,
      share: 0.25,
    });

    const pair = response.body.byClient.find(
      (item: { clientId: string; equipmentId: string }) =>
        item.clientId === clientId && item.equipmentId === treadmillId,
    );
    expect(pair).toMatchObject({
      usageCount: 1,
      lastUsedDate: '2027-10-01',
    });
  });

  it('ADMIN: группировка по типу и динамика по неделям', async () => {
    const byType = await authedGet(
      adminToken,
      '/reports/equipment-usage?from=2027-10-01&to=2027-10-31&group_by=type',
    );
    expect(byType.status).toBe(200);
    expect(byType.body.byType[0]).toMatchObject({
      type: 'CARDIO',
      usageCount: 2,
    });

    const weekly = await authedGet(
      adminToken,
      '/reports/equipment-usage?from=2027-10-01&to=2027-10-31&period=week',
    );
    expect(weekly.status).toBe(200);
    expect(weekly.body.dynamics[0]).toMatchObject({
      period: '2027-09-27',
      usageCount: 4,
    });
  });

  it('ADMIN: фильтры по залу, тренеру и клиенту', async () => {
    const byGym = await authedGet(
      adminToken,
      `/reports/equipment-usage?from=2027-10-01&to=2027-10-31&gym_id=${gymId}`,
    );
    expect(byGym.body.totalUsage).toBe(3);

    const byTrainer = await authedGet(
      adminToken,
      `/reports/equipment-usage?from=2027-10-01&to=2027-10-31&trainer_id=${trainerId}`,
    );
    expect(byTrainer.body.totalUsage).toBe(3);

    const byClient = await authedGet(
      adminToken,
      `/reports/equipment-usage?from=2027-10-01&to=2027-10-31&client_id=${otherClientId}`,
    );
    expect(byClient.body.totalUsage).toBe(1);
  });

  it('RECEPTION: только свой зал, чужой gym_id → 403', async () => {
    const own = await authedGet(
      receptionToken,
      '/reports/equipment-usage?from=2027-10-01&to=2027-10-31',
    );
    expect(own.status).toBe(200);
    expect(own.body.totalUsage).toBe(3);

    const foreign = await authedGet(
      receptionToken,
      `/reports/equipment-usage?gym_id=${otherGymId}`,
    );
    expect(foreign.status).toBe(403);
  });

  it('TRAINER: только свои тренировки', async () => {
    const response = await authedGet(
      trainerToken,
      '/reports/equipment-usage?from=2027-10-01&to=2027-10-31',
    );

    expect(response.status).toBe(200);
    expect(response.body.totalUsage).toBe(3);
    expect(
      response.body.byEquipment.every(
        (item: { equipmentId: string }) =>
          item.equipmentId !== machineId,
      ),
    ).toBe(true);
  });

  it('ADMIN без периода → 400', async () => {
    const response = await authedGet(adminToken, '/reports/equipment-usage');

    expect(response.status).toBe(400);
  });

  it('CLIENT не имеет доступа к отчёту по тренажёрам', async () => {
    const response = await authedGet(
      clientToken,
      '/reports/equipment-usage',
    );
    expect(response.status).toBe(403);
  });
});
