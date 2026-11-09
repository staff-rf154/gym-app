import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GymEquipmentType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000101';
const TRAINER_PHONE = '+79990000102';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME_PREFIX = 'E2E Gym';

describe('Gyms (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerId: string;
  let adminToken: string;
  let trainerToken: string;

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

  const cleanupGyms = async (): Promise<void> => {
    await prisma.gymEquipment.deleteMany({
      where: { gym: { name: { startsWith: GYM_NAME_PREFIX } } },
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

    await cleanupGyms();
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } },
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

    const trainer = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер',
      },
    });
    trainerId = trainer.id;

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    await cleanupGyms();
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, trainerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, trainerId] } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /admin/gyms без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/admin/gyms`,
    );

    expect(response.status).toBe(401);
  });

  it('GET /admin/gyms с токеном тренера → 403', async () => {
    const response = await authed(trainerToken).get('/admin/gyms');

    expect(response.status).toBe(403);
  });

  it('админ: полный CRUD', async () => {
    const created = await authed(adminToken)
      .post('/admin/gyms')
      .send({ name: `${GYM_NAME_PREFIX} CRUD`, address: 'ул. Тестовая, 1' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: `${GYM_NAME_PREFIX} CRUD`,
      address: 'ул. Тестовая, 1',
      isActive: true,
    });

    const gymId = created.body.id as string;

    const list = await authed(adminToken).get('/admin/gyms');

    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: gymId })]),
    );

    const getOne = await authed(adminToken).get(`/admin/gyms/${gymId}`);

    expect(getOne.status).toBe(200);
    expect(getOne.body).toMatchObject({
      id: gymId,
      name: `${GYM_NAME_PREFIX} CRUD`,
      address: 'ул. Тестовая, 1',
      isActive: true,
    });

    const updated = await authed(adminToken)
      .put(`/admin/gyms/${gymId}`)
      .send({ name: `${GYM_NAME_PREFIX} CRUD обновлён`, isActive: false });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: gymId,
      name: `${GYM_NAME_PREFIX} CRUD обновлён`,
      address: 'ул. Тестовая, 1',
      isActive: false,
    });

    const deleted = await authed(adminToken).delete(`/admin/gyms/${gymId}`);

    expect(deleted.status).toBe(204);

    const getDeleted = await authed(adminToken).get(`/admin/gyms/${gymId}`);

    expect(getDeleted.status).toBe(404);
  });

  it('GET /admin/gyms/:id для несуществующего зала → 404', async () => {
    const response = await authed(adminToken).get(
      '/admin/gyms/00000000-0000-4000-8000-000000000000',
    );

    expect(response.status).toBe(404);
  });

  it('DELETE /admin/gyms/:id с оборудованием → 409', async () => {
    const created = await authed(adminToken)
      .post('/admin/gyms')
      .send({ name: `${GYM_NAME_PREFIX} С оборудованием`, address: 'ул. Гантельная, 2' });

    expect(created.status).toBe(201);

    const gymId = created.body.id as string;

    await prisma.gymEquipment.create({
      data: {
        gymId,
        name: 'E2E Беговая дорожка',
        type: GymEquipmentType.CARDIO,
      },
    });

    const response = await authed(adminToken).delete(`/admin/gyms/${gymId}`);

    expect(response.status).toBe(409);

    const stillExists = await prisma.gym.findUnique({ where: { id: gymId } });

    expect(stillExists).not.toBeNull();
  });
});
