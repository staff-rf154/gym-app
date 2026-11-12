import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { DemoService } from './demo.service';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000901';
const CLIENT_PHONE = '+79990000902';
const TEST_PASSWORD = 'TestPass123!';
const DEMO_GYM_PREFIX = 'Демо-зал';
const DEMO_PHONE_PREFIX = '+7999555';

describe('Demo data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let demoService: DemoService;
  let adminToken: string;
  let clientToken: string;
  let realClientId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const cleanupUsers = async (): Promise<void> => {
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, CLIENT_PHONE] } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, CLIENT_PHONE] } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [ADMIN_PHONE, CLIENT_PHONE] } },
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
    demoService = app.get(DemoService);

    await demoService.clear();
    await cleanupUsers();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Демо Администратор',
      },
    });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Реальный Клиент',
      },
    });
    const realClient = await prisma.client.create({
      data: { userId: clientUser.id },
    });
    realClientId = realClient.id;

    adminToken = await login(ADMIN_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await demoService.clear();
    await cleanupUsers();
    await app.close();
  });

  it('POST /admin/demo/load доступен только администратору', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/demo/load`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('загружает демо-данные за 3 месяца', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/demo/load`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.gyms).toBe(3);
    expect(response.body.trainers).toBe(6);
    expect(response.body.clients).toBe(20);
    expect(response.body.exercises).toBe(24);
    expect(response.body.templates).toBe(12);
    expect(response.body.workouts).toBeGreaterThan(600);
    expect(response.body.measurements).toBe(260);
    expect(response.body.nutrition).toBe(40);
  });

  it('GET /admin/demo/status показывает загруженные данные', async () => {
    const response = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/demo/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.loaded).toBe(true);
    expect(response.body.gyms).toBe(3);
    expect(response.body.trainers).toBe(6);
    expect(response.body.clients).toBe(20);
    expect(response.body.workouts).toBeGreaterThan(600);
  });

  it('не допускает повторную загрузку без очистки', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/demo/load`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  it('данные распределены по 3 залам, 6 тренерам и 20 клиентам', async () => {
    const gyms = await prisma.gym.findMany({
      where: { name: { startsWith: DEMO_GYM_PREFIX } },
      include: { equipment: true },
      orderBy: { name: 'asc' },
    });
    expect(gyms).toHaveLength(3);
    gyms.forEach((gym) => {
      expect(gym.equipment.length).toBeGreaterThanOrEqual(10);
    });
    expect(new Set(gyms.map((gym) => gym.equipment.length)).size).toBeGreaterThan(
      1,
    );

    const clients = await prisma.client.count({
      where: { user: { phone: { startsWith: DEMO_PHONE_PREFIX } } },
    });
    expect(clients).toBe(20);

    const workouts = await prisma.workout.findMany({
      where: { gym: { name: { startsWith: DEMO_GYM_PREFIX } } },
      select: { date: true, trainerId: true, clientId: true },
      orderBy: { date: 'asc' },
    });
    expect(workouts.length).toBeGreaterThan(600);
    expect(new Set(workouts.map((workout) => workout.trainerId)).size).toBe(6);
    expect(new Set(workouts.map((workout) => workout.clientId)).size).toBe(20);

    const spanMs =
      workouts[workouts.length - 1].date.getTime() - workouts[0].date.getTime();
    const spanDays = spanMs / (24 * 60 * 60 * 1000);
    expect(spanDays).toBeGreaterThanOrEqual(85);
    expect(spanDays).toBeLessThanOrEqual(95);

    const items = await prisma.workoutItem.findMany({
      where: {
        workout: { gym: { name: { startsWith: DEMO_GYM_PREFIX } } },
        equipmentId: { not: null },
      },
      select: {
        workout: { select: { gymId: true } },
        equipment: { select: { gymId: true } },
      },
      take: 200,
    });
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.equipment?.gymId).toBe(item.workout.gymId);
    });
  });

  it('DELETE /admin/demo очищает только демо-данные', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${API_PREFIX}/admin/demo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.cleared).toBe(true);
    expect(response.body.gyms).toBe(3);
    expect(response.body.clients).toBe(20);

    const status = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/demo/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(status.body).toEqual({
      loaded: false,
      gyms: 0,
      trainers: 0,
      clients: 0,
      workouts: 0,
    });

    expect(
      await prisma.user.count({
        where: { phone: { startsWith: DEMO_PHONE_PREFIX } },
      }),
    ).toBe(0);
    expect(
      await prisma.gym.count({
        where: { name: { startsWith: DEMO_GYM_PREFIX } },
      }),
    ).toBe(0);
    expect(
      await prisma.workout.count({
        where: { gym: { name: { startsWith: DEMO_GYM_PREFIX } } },
      }),
    ).toBe(0);

    expect(
      await prisma.client.findUnique({ where: { id: realClientId } }),
    ).not.toBeNull();
  });

  it('повторная очистка безопасна', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${API_PREFIX}/admin/demo`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual({
      cleared: true,
      gyms: 0,
      trainers: 0,
      clients: 0,
      workouts: 0,
    });
  });
});
