import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000601';
const TRAINER_PHONE = '+79990000602';
const OTHER_TRAINER_PHONE = '+79990000603';
const CLIENT_PHONE = '+79990000610';
const TEST_PASSWORD = 'TestPass123!';
const MISSING_CLIENT_ID = '00000000-0000-4000-8000-000000000000';

describe('Weight measurements (e2e)', () => {
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
  let adminToken: string;
  let trainerToken: string;
  let otherTrainerToken: string;
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
    await prisma.gym.deleteMany({ where: { name: 'E2E Weight Gym' } });
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
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер',
      },
    });
    otherTrainerUserId = otherTrainerUser.id;
    const otherTrainer = await prisma.trainer.create({
      data: { userId: otherTrainerUser.id },
    });
    otherTrainerId = otherTrainer.id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент',
      },
    });
    clientUserId = clientUser.id;
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const gym = await prisma.gym.create({
      data: { name: 'E2E Weight Gym', address: 'ул. Весовая, 1' },
    });
    gymId = gym.id;

    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId },
    });

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
    otherTrainerToken = await login(OTHER_TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.weightMeasurement.deleteMany({ where: { clientId } });
    await prisma.clientTrainer.deleteMany({
      where: { clientId },
    });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.trainer.deleteMany({
      where: { id: { in: [trainerId, otherTrainerId] } },
    });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: {
        userId: {
          in: [
            adminId,
            trainerUserId,
            otherTrainerUserId,
            clientUserId,
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            adminId,
            trainerUserId,
            otherTrainerUserId,
            clientUserId,
          ],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/client/${clientId}/weight-measurements`,
    );

    expect(response.status).toBe(401);
  });

  it('GET клиентом → 403', async () => {
    const response = await authed(clientToken).get(
      `/client/${clientId}/weight-measurements`,
    );

    expect(response.status).toBe(403);
  });

  it('GET админом → 403', async () => {
    const response = await authed(adminToken).get(
      `/client/${clientId}/weight-measurements`,
    );

    expect(response.status).toBe(403);
  });

  it('GET непривязанным тренером → 403', async () => {
    const response = await authed(otherTrainerToken).get(
      `/client/${clientId}/weight-measurements`,
    );

    expect(response.status).toBe(403);
  });

  it('GET привязанным тренером для несуществующего клиента → 404', async () => {
    const response = await authed(trainerToken).get(
      `/client/${MISSING_CLIENT_ID}/weight-measurements`,
    );

    expect(response.status).toBe(404);
  });

  it('POST замер привязанным тренером → 201 с measuredBy', async () => {
    const response = await authed(trainerToken)
      .post(`/client/${clientId}/weight-measurements`)
      .send({
        weight: 80,
        fatMass: 20,
        measuredAt: '2026-11-01T10:00:00.000Z',
        comment: 'Первый замер',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      clientId,
      measuredBy: trainerUserId,
      weight: 80,
      fatMass: 20,
      comment: 'Первый замер',
    });
  });

  it('POST второй замер и GET отдаёт список по убыванию даты', async () => {
    const second = await authed(trainerToken)
      .post(`/client/${clientId}/weight-measurements`)
      .send({ weight: 79, measuredAt: '2026-11-05T10:00:00.000Z' });

    expect(second.status).toBe(201);

    const list = await authed(trainerToken).get(
      `/client/${clientId}/weight-measurements`,
    );

    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].weight).toBe(79);
    expect(list.body[1].weight).toBe(80);
  });

  it('POST с отрицательным весом → 400', async () => {
    const response = await authed(trainerToken)
      .post(`/client/${clientId}/weight-measurements`)
      .send({ weight: -1, measuredAt: '2026-11-05T10:00:00.000Z' });

    expect(response.status).toBe(400);
  });

  it('POST непривязанным тренером → 403', async () => {
    const response = await authed(otherTrainerToken)
      .post(`/client/${clientId}/weight-measurements`)
      .send({ weight: 80, measuredAt: '2026-11-05T10:00:00.000Z' });

    expect(response.status).toBe(403);
  });
});
