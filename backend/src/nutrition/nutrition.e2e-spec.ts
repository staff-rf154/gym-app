import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NutritionType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990001001';
const CLIENT_PHONE = '+79990001002';
const OTHER_CLIENT_PHONE = '+79990001003';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE, OTHER_CLIENT_PHONE];
const GYM_NAME = 'E2E Nutrition Gym';
const TARGET_DATE = '2026-11-10';

describe('Nutrition (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerId: string;
  let clientId: string;
  let otherClientId: string;
  let trainerToken: string;
  let clientToken: string;
  let otherClientToken: string;
  let visibleId: string;

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

    await prisma.nutritionRecommendation.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { trainer: { user: { phone: { in: PHONES } } } },
          { client: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер Питания',
      },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Питания',
      },
    });
    const client = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    clientId = client.id;

    const otherClientUser = await prisma.user.create({
      data: {
        phone: OTHER_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Другой клиент питания',
      },
    });
    const otherClient = await prisma.client.create({
      data: { userId: otherClientUser.id },
    });
    otherClientId = otherClient.id;

    const gym = await prisma.gym.create({
      data: { name: GYM_NAME, address: 'ул. Питания, 1' },
    });

    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId: gym.id },
    });

    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
    otherClientToken = await login(OTHER_CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.nutritionRecommendation.deleteMany({
      where: { clientId: { in: [clientId, otherClientId] } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { clientId: { in: [clientId, otherClientId] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /trainer/nutrition привязанному клиенту → 201', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/nutrition')
      .send({
        client_id: clientId,
        type: NutritionType.DAILY,
        kcal: 2200,
        protein: 150,
        fat: 70,
        carbs: 220,
        comment: 'Пить воду',
        validFrom: '2026-11-01',
        validTo: '2026-11-30',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      clientId,
      trainerId,
      type: 'DAILY',
      kcal: 2200,
    });
    visibleId = response.body.id as string;
  });

  it('POST /trainer/nutrition непривязанному клиенту → 403', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/nutrition')
      .send({ client_id: otherClientId, type: NutritionType.DAILY });

    expect(response.status).toBe(403);
  });

  it('POST /trainer/nutrition с validFrom > validTo → 400', async () => {
    const response = await authed(trainerToken)
      .post('/trainer/nutrition')
      .send({
        client_id: clientId,
        type: NutritionType.DAILY,
        validFrom: '2026-12-01',
        validTo: '2026-11-01',
      });

    expect(response.status).toBe(400);
  });

  it('GET /client/nutrition?date= фильтрует по validFrom/validTo', async () => {
    await prisma.nutritionRecommendation.createMany({
      data: [
        {
          clientId,
          trainerId,
          type: NutritionType.DAILY,
          comment: 'Будущая рекомендация',
          validFrom: new Date('2026-12-01T00:00:00.000Z'),
        },
        {
          clientId,
          trainerId,
          type: NutritionType.DAILY,
          comment: 'Просроченная рекомендация',
          validTo: new Date('2026-10-31T00:00:00.000Z'),
        },
        {
          clientId: otherClientId,
          trainerId,
          type: NutritionType.DAILY,
          comment: 'Рекомендация другого клиента',
        },
      ],
    });

    const response = await authed(clientToken).get(
      `/client/nutrition?date=${TARGET_DATE}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(visibleId);
  });

  it('GET /client/nutrition не показывает чужие рекомендации', async () => {
    const response = await authed(otherClientToken).get(
      `/client/nutrition?date=${TARGET_DATE}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].comment).toBe('Рекомендация другого клиента');
  });

  it('GET /trainer/nutrition привязанному клиенту → 200', async () => {
    const response = await authed(trainerToken).get(
      `/trainer/nutrition?client_id=${clientId}`,
    );

    expect(response.status).toBe(200);
    expect(
      response.body.map((item: { id: string }) => item.id),
    ).toContain(visibleId);
  });

  it('GET /trainer/nutrition непривязанному клиенту → 403', async () => {
    const response = await authed(trainerToken).get(
      `/trainer/nutrition?client_id=${otherClientId}`,
    );

    expect(response.status).toBe(403);
  });
});
