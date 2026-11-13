import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const TEST_PHONE = '+79990000001';
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E Клиент';
const DEFAULT_TIMEZONE = 'Asia/Novosibirsk';
const MOSCOW_TIMEZONE = 'Europe/Moscow';
const API_PREFIX = '/api/v1';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;

  const login = (phone = TEST_PHONE, password = TEST_PASSWORD) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password });

  const getMe = (accessToken: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.refreshToken.deleteMany({
      where: { user: { phone: TEST_PHONE } },
    });
    await prisma.user.deleteMany({ where: { phone: TEST_PHONE } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        phone: TEST_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: TEST_NAME,
        timezone: DEFAULT_TIMEZONE,
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { timezone: DEFAULT_TIMEZONE, pushToken: null },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /auth/login с верными данными → 200', async () => {
    const response = await login();
    const header = response.headers['set-cookie'];
    const cookies = Array.isArray(header) ? header : [header];
    const refreshCookie = cookies.find((cookie) =>
      cookie?.startsWith('refresh_token='),
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      access_token: expect.any(String),
      refresh_token: expect.any(String),
      role: Role.CLIENT,
      user_id: userId,
    });
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Strict');
    expect(refreshCookie).not.toContain('Secure');
  });

  it('HTTPS-прокси ставит Secure cookie и refresh работает по cookie', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .set('X-Forwarded-Proto', 'https')
      .send({ phone: TEST_PHONE, password: TEST_PASSWORD });
    const header = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(header) ? header : [header];
    const refreshCookie = cookies.find((cookie) =>
      cookie?.startsWith('refresh_token='),
    );

    expect(refreshCookie).toContain('Secure');

    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .set('Cookie', refreshCookie?.split(';')[0] ?? '')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.access_token).toEqual(expect.any(String));
  });

  it('POST /auth/login с неверным паролем → 401', async () => {
    const response = await login(TEST_PHONE, 'WrongPassword123!');

    expect(response.status).toBe(401);
  });

  it('POST /auth/login с несуществующим phone → 401', async () => {
    const response = await login('+79990000999', TEST_PASSWORD);

    expect(response.status).toBe(401);
  });

  it('GET /auth/me без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/auth/me`,
    );

    expect(response.status).toBe(401);
  });

  it('GET /auth/me с токеном → 200 и timezone по умолчанию', async () => {
    const { body } = await login();
    const response = await getMe(body.access_token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: userId,
      role: Role.CLIENT,
      name: TEST_NAME,
      phone: TEST_PHONE,
      timezone: DEFAULT_TIMEZONE,
    });
  });

  it('POST /auth/refresh выполняет rotation, старый refresh → 401', async () => {
    const { body } = await login();
    const oldRefreshToken = body.refresh_token as string;

    const refreshResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refresh_token: oldRefreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.access_token).toEqual(expect.any(String));
    expect(refreshResponse.body.refresh_token).toEqual(expect.any(String));
    expect(refreshResponse.body.refresh_token).not.toBe(oldRefreshToken);

    const reuseResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refresh_token: oldRefreshToken });

    expect(reuseResponse.status).toBe(401);
  });

  it('PATCH /auth/timezone Europe/Moscow → 204 и /auth/me показывает Moscow', async () => {
    const { body } = await login();
    const accessToken = body.access_token as string;

    const patchResponse = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/auth/timezone`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: MOSCOW_TIMEZONE });

    expect(patchResponse.status).toBe(204);

    const meResponse = await getMe(accessToken);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.timezone).toBe(MOSCOW_TIMEZONE);
  });

  it('PATCH /auth/timezone с невалидной зоной → 400', async () => {
    const { body } = await login();

    const response = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/auth/timezone`)
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({ timezone: 'Invalid/Zone' });

    expect(response.status).toBe(400);
  });

  it('PATCH /auth/push-token → 204 и токен сохранён в User', async () => {
    const { body } = await login();
    const pushToken = 'fcm-e2e-token';

    const response = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/auth/push-token`)
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({ token: pushToken });

    expect(response.status).toBe(204);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    expect(user?.pushToken).toBe(pushToken);
  });

  it('PATCH /auth/push-token с пустым токеном → 400', async () => {
    const { body } = await login();

    const response = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/auth/push-token`)
      .set('Authorization', `Bearer ${body.access_token}`)
      .send({ token: '' });

    expect(response.status).toBe(400);
  });

  it('PATCH /auth/push-token без токена авторизации → 401', async () => {
    const response = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/auth/push-token`)
      .send({ token: 'fcm-e2e-token' });

    expect(response.status).toBe(401);
  });
});
