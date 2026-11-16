import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000501';
const TRAINER_PHONE = '+79990000502';
const NEW_TRAINER_PHONE = '+79990000503';
const CLIENT_PHONE = '+79990000510';
const TEST_PASSWORD = 'TestPass123!';
const GYM_PREFIX = 'E2E Gym';
const EXPECTED_INITIAL_PASSWORD =
  process.env.DEFAULT_CLIENT_PASSWORD ?? 'ChangeMe123!';

describe('Clients, Trainers and links (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerUserId: string;
  let gymId: string;
  let adminToken: string;
  let trainerToken: string;
  let clientId: string;
  let trainerId: string;
  let newTrainerId: string;
  let linkId: string;

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
    put: (path: string) =>
      request(app.getHttpServer())
        .put(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`),
    delete: (path: string) =>
      request(app.getHttpServer())
        .delete(`${API_PREFIX}${path}`)
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

    await prisma.clientTrainer.deleteMany({
      where: { gym: { name: { startsWith: GYM_PREFIX } } },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { startsWith: '+7999000051' } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { startsWith: '+7999000051' } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { in: [TRAINER_PHONE, NEW_TRAINER_PHONE] } } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: [TRAINER_PHONE, NEW_TRAINER_PHONE] } } },
    });
    await prisma.gym.deleteMany({
      where: { name: { startsWith: GYM_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          phone: { in: [ADMIN_PHONE, TRAINER_PHONE, NEW_TRAINER_PHONE] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        phone: {
          in: [ADMIN_PHONE, TRAINER_PHONE, NEW_TRAINER_PHONE, CLIENT_PHONE],
        },
      },
    });

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

    const gym = await prisma.gym.create({
      data: { name: `${GYM_PREFIX} Основной`, address: 'ул. Тестовая, 1' },
    });
    gymId = gym.id;

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    const trainerIds = [trainerId, newTrainerId].filter(
      Boolean,
    ) as string[];
    await prisma.clientTrainer.deleteMany({
      where: { clientId, trainerId },
    });
    await prisma.weightMeasurement.deleteMany({ where: { clientId } });
    if (clientId) {
      await prisma.clientGym.deleteMany({ where: { clientId } });
      await prisma.client.deleteMany({ where: { id: clientId } });
    }
    await prisma.trainerGym.deleteMany({
      where: { trainerId: { in: trainerIds } },
    });
    await prisma.trainer.deleteMany({
      where: { id: { in: trainerIds } },
    });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          phone: { in: [ADMIN_PHONE, TRAINER_PHONE, NEW_TRAINER_PHONE] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        phone: {
          in: [ADMIN_PHONE, TRAINER_PHONE, NEW_TRAINER_PHONE, CLIENT_PHONE],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /admin/clients без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/admin/clients`,
    );

    expect(response.status).toBe(401);
  });

  it('POST /admin/clients тренером → 403', async () => {
    const response = await authed(trainerToken)
      .post('/admin/clients')
      .send({ phone: '+79990000599', name: 'Запрещено' });

    expect(response.status).toBe(403);
  });

  it('админ создаёт клиента: initial_password, age, пустые тренеры', async () => {
    const response = await authed(adminToken)
      .post('/admin/clients')
      .send({
        phone: CLIENT_PHONE,
        name: 'E2E Клиент',
        gender: 'MALE',
        height: 180,
        birthdate: '1990-01-01',
        startWeight: 80,
        startFatMass: 20,
        goal: 'Похудение',
        notes: 'Тест',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      phone: CLIENT_PHONE,
      name: 'E2E Клиент',
      gender: 'MALE',
      height: 180,
      startWeight: 80,
      startFatMass: 20,
      goal: null,
      goalText: 'Похудение',
      currentWeight: null,
      currentFatMass: null,
      active_trainers: [],
      initial_password: EXPECTED_INITIAL_PASSWORD,
    });
    expect(typeof response.body.age).toBe('number');

    clientId = response.body.id as string;
  });

  it('повторный телефон клиента → 409', async () => {
    const response = await authed(adminToken)
      .post('/admin/clients')
      .send({ phone: CLIENT_PHONE, name: 'Дубль' });

    expect(response.status).toBe(409);
  });

  it('PUT /admin/clients/:id обновляет профиль', async () => {
    const response = await authed(adminToken)
      .put(`/admin/clients/${clientId}`)
      .send({ name: 'E2E Клиент Обновлён', goal: 'Масса', height: 181 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: clientId,
      name: 'E2E Клиент Обновлён',
      goal: null,
      goalText: 'Масса',
      height: 181,
      startWeight: 80,
    });
  });

  it('админ создаёт тренера: initial_password', async () => {
    const response = await authed(adminToken)
      .post('/admin/trainers')
      .send({ phone: NEW_TRAINER_PHONE, name: 'E2E Тренер API' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      phone: NEW_TRAINER_PHONE,
      name: 'E2E Тренер API',
      initial_password: EXPECTED_INITIAL_PASSWORD,
    });

    newTrainerId = response.body.id as string;
  });

  it('повторный телефон тренера → 409', async () => {
    const response = await authed(adminToken)
      .post('/admin/trainers')
      .send({ phone: NEW_TRAINER_PHONE, name: 'Дубль' });

    expect(response.status).toBe(409);
  });

  it('GET /admin/trainers возвращает плоский список', async () => {
    const response = await authed(adminToken).get('/admin/trainers');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: newTrainerId,
          phone: NEW_TRAINER_PHONE,
          name: 'E2E Тренер API',
        }),
        expect.objectContaining({
          id: trainerId,
          phone: TRAINER_PHONE,
          name: 'E2E Тренер',
        }),
      ]),
    );
  });

  it('GET /admin/trainers?page=1&limit=1 отдаёт пагинацию', async () => {
    const response = await authed(adminToken).get(
      '/admin/trainers?page=1&limit=1',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, limit: 1 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/clients?limit=101 → 400', async () => {
    const response = await authed(adminToken).get(
      '/admin/clients?limit=101',
    );

    expect(response.status).toBe(400);
  });

  it('GET /admin/clients?page=0 → 400', async () => {
    const response = await authed(adminToken).get('/admin/clients?page=0');

    expect(response.status).toBe(400);
  });

  it('POST /admin/clients/:id/trainers создаёт связь', async () => {
    const response = await authed(adminToken)
      .post(`/admin/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId, gym_id: gymId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      clientId,
      trainerId,
      gymId,
      isActive: true,
    });

    linkId = response.body.id as string;
  });

  it('повторная активная связь → 409', async () => {
    const response = await authed(adminToken)
      .post(`/admin/clients/${clientId}/trainers`)
      .send({ trainer_id: trainerId, gym_id: gymId });

    expect(response.status).toBe(409);
  });

  it('GET /admin/clients отдаёт active_trainers с именами', async () => {
    const response = await authed(adminToken).get('/admin/clients?limit=100');

    expect(response.status).toBe(200);
    const client = response.body.items.find(
      (item: { id: string }) => item.id === clientId,
    );

    expect(client.active_trainers).toEqual([
      expect.objectContaining({
        id: linkId,
        trainerId,
        trainerName: 'E2E Тренер',
        gymId,
        gymName: `${GYM_PREFIX} Основной`,
        isActive: true,
      }),
    ]);
  });

  it('DELETE /admin/clients/:id/trainers/:linkId → 204 и soft delete', async () => {
    const deleted = await authed(adminToken).delete(
      `/admin/clients/${clientId}/trainers/${linkId}`,
    );
    expect(deleted.status).toBe(204);

    const link = await prisma.clientTrainer.findUnique({
      where: { id: linkId },
    });
    expect(link?.isActive).toBe(false);

    const list = await authed(adminToken).get('/admin/clients?limit=100');
    const client = list.body.items.find(
      (item: { id: string }) => item.id === clientId,
    );
    expect(client.active_trainers).toEqual([]);
  });

  it('DELETE несуществующей связи → 404', async () => {
    const response = await authed(adminToken).delete(
      `/admin/clients/${clientId}/trainers/${linkId}`,
    );

    expect(response.status).toBe(404);
  });

  it('DELETE /admin/trainers/:id и /admin/clients/:id → 204', async () => {
    const deletedTrainer = await authed(adminToken).delete(
      `/admin/trainers/${newTrainerId}`,
    );
    expect(deletedTrainer.status).toBe(204);

    const deletedClient = await authed(adminToken).delete(
      `/admin/clients/${clientId}`,
    );
    expect(deletedClient.status).toBe(204);
  });
});
