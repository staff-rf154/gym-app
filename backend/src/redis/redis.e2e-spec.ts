import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000201';
const TRAINER_PHONE = '+79990000202';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Redis Gym';

describe('Redis cache and throttling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminToken: string;
  let gymId: string | null = null;

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
    post: (path: string, body: object) =>
      request(app.getHttpServer())
        .post(`${API_PREFIX}${path}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    redis = app.get(RedisService);

    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: TRAINER_PHONE } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } },
    });
    await prisma.gym.deleteMany({ where: { name: GYM_NAME } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Redis Admin',
      },
    });

    adminToken = await login(ADMIN_PHONE);
  });

  afterAll(async () => {
    if (gymId) {
      await prisma.gym.deleteMany({ where: { id: gymId } });
    }

    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: TRAINER_PHONE } },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [ADMIN_PHONE, TRAINER_PHONE] } },
    });

    await redis.invalidatePrefix('cache:');
    await redis.invalidatePrefix('throttle:');
    await app.close();
    await prisma.$disconnect();
  });

  it('throttler пишет счётчики в Redis', async () => {
    expect(redis.isReady).toBe(true);

    const keys = await redis.connection.keys(
      redis.namespaced('throttle:*'),
    );
    expect(keys.length).toBeGreaterThan(0);
  });

  it('кеширует справочник залов и инвалидирует кеш при изменении', async () => {
    await redis.invalidatePrefix('cache:gyms:');

    await authed(adminToken).get('/gyms').expect(200);
    const cached = await redis.get<Array<{ id: string }>>('cache:gyms:all');
    expect(cached).not.toBeNull();

    const created = await authed(adminToken)
      .post('/admin/gyms', { name: GYM_NAME, address: 'ул. Redis, 1' })
      .expect(201);
    gymId = created.body.id as string;

    expect(await redis.get('cache:gyms:all')).toBeNull();

    const list = await authed(adminToken).get('/gyms').expect(200);
    expect(list.body.map((gym: { id: string }) => gym.id)).toContain(gymId);

    const refreshed = await redis.get<Array<{ id: string }>>(
      'cache:gyms:all',
    );
    expect(refreshed).not.toBeNull();
    expect(refreshed?.map((gym) => gym.id)).toContain(gymId);
  });

  it('кеширует отчёты и инвалидирует их при изменении данных', async () => {
    await authed(adminToken)
      .get('/reports/attendance?from=2026-01-01&to=2026-12-31')
      .expect(200);

    const cachedKeys = await redis.connection.keys(
      redis.namespaced('cache:reports:*'),
    );
    expect(cachedKeys.length).toBeGreaterThan(0);

    await authed(adminToken)
      .post('/admin/trainers', {
        phone: TRAINER_PHONE,
        name: 'E2E Redis Тренер',
      })
      .expect(201);

    const afterMutation = await redis.connection.keys(
      redis.namespaced('cache:reports:*'),
    );
    expect(afterMutation).toHaveLength(0);
  });
});
