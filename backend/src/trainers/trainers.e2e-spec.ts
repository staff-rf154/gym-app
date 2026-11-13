import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const PHONE_PREFIX = '+799900021';
const ADMIN_PHONE = `${PHONE_PREFIX}01`;
const TRAINER_PHONE = `${PHONE_PREFIX}02`;
const CLIENT_PHONE = `${PHONE_PREFIX}03`;
const TEST_PASSWORD = 'TestPass123!';

describe('Trainer soft delete (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let trainerToken: string;
  let trainerRefreshToken: string;
  let gymId: string;
  let trainerId: string;
  let trainerUserId: string;
  let clientId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD })
      .expect(200);

    return response.body.access_token as string;
  };

  const cleanup = async () => {
    await prisma.clientTrainer.deleteMany({
      where: { trainer: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.workout.deleteMany({
      where: { trainer: { user: { phone: { startsWith: PHONE_PREFIX } } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { startsWith: PHONE_PREFIX } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { startsWith: PHONE_PREFIX } },
    });
    await prisma.gym.deleteMany({
      where: { name: { startsWith: 'E2E Archive Gym' } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'Admin',
      },
    });

    const gym = await prisma.gym.create({
      data: { name: 'E2E Archive Gym', address: 'Test address' },
    });
    gymId = gym.id;

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'Trainer',
      },
    });
    trainerUserId = trainerUser.id;
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;
    await prisma.trainerGym.create({
      data: { trainerId: trainer.id, gymId: gym.id },
    });

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'Client',
      },
    });
    const client = await prisma.client.create({
      data: {
        userId: clientUser.id,
        startWeight: 70,
      },
    });
    clientId = client.id;
    await prisma.clientGym.create({
      data: { clientId: client.id, gymId: gym.id },
    });
    await prisma.clientTrainer.create({
      data: { clientId: client.id, trainerId: trainer.id, gymId: gym.id },
    });
    await prisma.workout.create({
      data: {
        clientId: client.id,
        trainerId: trainer.id,
        gymId: gym.id,
        date: new Date('2026-11-01'),
      },
    });

    adminToken = await login(ADMIN_PHONE);
    trainerToken = await login(TRAINER_PHONE);
    const trainerLogin = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone: TRAINER_PHONE, password: TEST_PASSWORD })
      .expect(200);
    trainerRefreshToken = trainerLogin.body.refresh_token as string;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('архивирует тренера и сохраняет историю', async () => {
    expect(trainerToken).toBeDefined();

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/admin/trainers/${trainerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const trainer = await prisma.trainer.findUniqueOrThrow({
      where: { id: trainerId },
    });
    expect(trainer.isActive).toBe(false);
    expect(trainer.archivedAt).not.toBeNull();

    expect(
      await prisma.workout.count({ where: { trainerId } }),
    ).toBe(1);
    expect(
      await prisma.clientTrainer.count({
        where: { trainerId, isActive: true },
      }),
    ).toBe(0);
    expect(
      await prisma.trainerGym.count({ where: { trainerId, isActive: true } }),
    ).toBe(0);
    expect(
      await prisma.refreshToken.count({ where: { userId: trainerUserId } }),
    ).toBe(0);
  });

  it('скрывает архивного тренера из списка и показывает по флагу', async () => {
    const list = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/trainers?limit=100`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      (list.body.items as { id: string }[]).some(
        (item) => item.id === trainerId,
      ),
    ).toBe(false);

    const archived = await request(app.getHttpServer())
      .get(`${API_PREFIX}/admin/trainers?limit=100&include_archived=true`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = (archived.body.items as { id: string; isActive: boolean }[])
      .find((item) => item.id === trainerId);
    expect(found?.isActive).toBe(false);
  });

  it('запрещает вход и обновление токена архивному тренеру', async () => {
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone: TRAINER_PHONE, password: TEST_PASSWORD })
      .expect(401);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refresh_token: trainerRefreshToken })
      .expect(401);
  });

  it('не даёт клиенту доступ к архивированию', async () => {
    const clientToken = await login(CLIENT_PHONE);
    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/admin/trainers/${trainerId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });
});
