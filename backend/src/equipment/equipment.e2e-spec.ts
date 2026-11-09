import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GymEquipmentType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990000201';
const TRAINER_PHONE = '+79990000202';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME_PREFIX = 'E2E Equipment Gym';

describe('Equipment + Upload (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let gymId: string;
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

  const cleanup = async (): Promise<void> => {
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

    await cleanup();
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

    const gym = await prisma.gym.create({
      data: {
        name: `${GYM_NAME_PREFIX} Основной`,
        address: 'ул. Тестовая, 3',
      },
    });
    gymId = gym.id;

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [adminId, trainerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, trainerId] } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /admin/gyms/:gymId/equipment minWeight > maxWeight → 400', async () => {
    const response = await authed(adminToken)
      .post(`/admin/gyms/${gymId}/equipment`)
      .send({
        name: 'Некорректные веса',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 100,
        maxWeight: 50,
      });

    expect(response.status).toBe(400);
  });

  it('POST /admin/gyms/:gymId/equipment с невалидным type → 400', async () => {
    const response = await authed(adminToken)
      .post(`/admin/gyms/${gymId}/equipment`)
      .send({
        name: 'Неизвестный тип',
        type: 'INVALID_TYPE',
      });

    expect(response.status).toBe(400);
  });

  it('админ: полный CRUD оборудования', async () => {
    const created = await authed(adminToken)
      .post(`/admin/gyms/${gymId}/equipment`)
      .send({
        name: 'E2E Штанга',
        type: GymEquipmentType.FREE_WEIGHT,
        minWeight: 5,
        maxWeight: 100,
        description: 'Гриф 20 кг',
      });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      gymId,
      name: 'E2E Штанга',
      type: GymEquipmentType.FREE_WEIGHT,
      minWeight: 5,
      maxWeight: 100,
      description: 'Гриф 20 кг',
    });

    const equipmentId = created.body.id as string;

    const list = await authed(adminToken).get(
      `/admin/gyms/${gymId}/equipment`,
    );

    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: equipmentId }),
      ]),
    );

    const updated = await authed(adminToken)
      .put(`/admin/equipment/${equipmentId}`)
      .send({ name: 'E2E Штанга обновлённая', maxWeight: 120 });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id: equipmentId,
      name: 'E2E Штанга обновлённая',
      minWeight: 5,
      maxWeight: 120,
    });

    const deleted = await authed(adminToken).delete(
      `/admin/equipment/${equipmentId}`,
    );

    expect(deleted.status).toBe(204);

    const listAfterDelete = await authed(adminToken).get(
      `/admin/gyms/${gymId}/equipment`,
    );

    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: equipmentId }),
      ]),
    );
  });

  it('GET /gyms/:gymId/equipment тренером → 200', async () => {
    const created = await authed(adminToken)
      .post(`/admin/gyms/${gymId}/equipment`)
      .send({
        name: 'E2E Беговая дорожка',
        type: GymEquipmentType.CARDIO,
      });

    expect(created.status).toBe(201);

    const equipmentId = created.body.id as string;

    const response = await authed(trainerToken).get(
      `/gyms/${gymId}/equipment`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: equipmentId }),
      ]),
    );
  });

  it('POST /admin/upload без файла → 400', async () => {
    const response = await authed(adminToken).post('/admin/upload');

    expect(response.status).toBe(400);
  });

  it('POST /admin/upload с файлом .exe → 400', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('MZ'), {
        filename: 'virus.exe',
        contentType: 'application/octet-stream',
      });

    expect(response.status).toBe(400);
  });
});
