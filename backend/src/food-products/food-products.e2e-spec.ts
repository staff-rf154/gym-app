import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000401';
const TRAINER_PHONE = '+79990000402';
const TEST_PASSWORD = 'TestPass123!';
const NAME_PREFIX = 'E2E Product';

describe('FoodProducts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerId: string;
  let adminToken: string;
  let trainerToken: string;
  let productId: string;

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

    await prisma.foodProduct.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
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
    await prisma.foodProduct.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, trainerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, trainerId] } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /admin/food-products без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/admin/food-products`,
    );

    expect(response.status).toBe(401);
  });

  it('POST /admin/food-products тренером → 403', async () => {
    const response = await authed(trainerToken)
      .post('/admin/food-products')
      .send({ name: 'Запрещено', kcal: 1, protein: 1, fat: 1, carbs: 1 });

    expect(response.status).toBe(403);
  });

  it('POST с отрицательным значением → 400', async () => {
    const response = await authed(adminToken)
      .post('/admin/food-products')
      .send({ name: 'Негатив', kcal: -1, protein: 1, fat: 1, carbs: 1 });

    expect(response.status).toBe(400);
  });

  it('админ: полный CRUD продукта', async () => {
    const created = await authed(adminToken)
      .post('/admin/food-products')
      .send({
        name: `${NAME_PREFIX} Куриная грудка`,
        kcal: 165,
        protein: 31,
        fat: 3.6,
        carbs: 0,
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: `${NAME_PREFIX} Куриная грудка`,
      kcal: 165,
      protein: 31,
      fat: 3.6,
      carbs: 0,
    });

    productId = created.body.id as string;

    const list = await authed(adminToken).get('/admin/food-products');
    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: productId })]),
    );

    const updated = await authed(adminToken)
      .put(`/admin/food-products/${productId}`)
      .send({ kcal: 170 });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: productId,
      kcal: 170,
      protein: 31,
    });

    const deleted = await authed(adminToken).delete(
      `/admin/food-products/${productId}`,
    );
    expect(deleted.status).toBe(204);

    const again = await authed(adminToken).delete(
      `/admin/food-products/${productId}`,
    );
    expect(again.status).toBe(404);
  });
});
