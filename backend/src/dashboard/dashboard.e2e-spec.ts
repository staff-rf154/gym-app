import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990004001';
const ADMINISTRATOR_PHONE = '+79990004002';
const TRAINER_PHONE = '+79990004003';
const CLIENT_PHONE = '+79990004004';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAME = 'E2E Dashboard Gym';
const PHONES = [
  ADMIN_PHONE,
  ADMINISTRATOR_PHONE,
  TRAINER_PHONE,
  CLIENT_PHONE,
];

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminUserId: string;
  let administratorUserId: string;
  let trainerUserId: string;
  let clientUserId: string;
  let gymId: string;
  let clientId: string;
  let trainerId: string;
  let adminToken: string;
  let administratorToken: string;
  let trainerToken: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const cleanup = async () => {
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.administrator.deleteMany({
      where: { user: { phone: { in: PHONES } } },
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

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const createUser = (phone: string, role: Role, name: string) =>
      prisma.user.create({
        data: { phone, passwordHash, role, name, timezone: 'Europe/Moscow' },
      });

    adminUserId = (
      await createUser(ADMIN_PHONE, Role.ADMIN, 'E2E Дашборд Админ')
    ).id;
    administratorUserId = (
      await createUser(
        ADMINISTRATOR_PHONE,
        Role.ADMINISTRATOR,
        'E2E Дашборд Администратор',
      )
    ).id;
    trainerUserId = (
      await createUser(TRAINER_PHONE, Role.TRAINER, 'E2E Дашборд Тренер')
    ).id;
    clientUserId = (
      await createUser(CLIENT_PHONE, Role.CLIENT, 'E2E Дашборд Клиент')
    ).id;

    gymId = (
      await prisma.gym.create({
        data: { name: GYM_NAME, address: 'ул. Дашборд, 1' },
      })
    ).id;
    await prisma.administrator.create({
      data: { userId: administratorUserId, gymId },
    });
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUserId } })
    ).id;
    clientId = (
      await prisma.client.create({ data: { userId: clientUserId } })
    ).id;
    await prisma.trainerGym.create({ data: { trainerId, gymId } });
    await prisma.clientGym.create({ data: { clientId, gymId } });
    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId },
    });

    const previousWeekMonday = new Date();
    previousWeekMonday.setUTCHours(0, 0, 0, 0);
    const day = previousWeekMonday.getUTCDay() || 7;
    previousWeekMonday.setUTCDate(previousWeekMonday.getUTCDate() - day - 6);

    await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId,
        date: previousWeekMonday,
        status: WorkoutStatus.COMPLETED,
      },
    });

    adminToken = await login(ADMIN_PHONE);
    administratorToken = await login(ADMINISTRATOR_PHONE);
    trainerToken = await login(TRAINER_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await app.close();
  });

  it('недельной статистики по умолчанию: админ видит отчёты за прошлую неделю', async () => {
    const response = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/dashboard/stats`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.gyms).toBeGreaterThanOrEqual(1);
    expect(response.body.report.visits).toBeGreaterThanOrEqual(1);
    expect(response.body.report.uniqueClients).toBeGreaterThanOrEqual(1);
    expect(response.body.report).toHaveProperty('activeTrainers');
    expect(response.body.report).toHaveProperty('equipmentUsage');
  });

  it('администратор зала видит только свой зал', async () => {
    const response = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/dashboard/stats`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200);

    expect(response.body.gyms).toBe(1);
    expect(response.body.report.visits).toBeGreaterThanOrEqual(1);
  });

  it('тренер не имеет доступа к дашборду', async () => {
    await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/dashboard/stats`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .expect(403);
  });

  it('некорректный from → 400', async () => {
    await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/dashboard/stats?from=16.11.2026`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
