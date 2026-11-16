import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990000901';
const OTHER_TRAINER_PHONE = '+79990000902';
const CLIENT_PHONE = '+79990000903';
const SECOND_CLIENT_PHONE = '+79990000904';
const INACTIVE_CLIENT_PHONE = '+79990000905';
const OTHER_TRAINER_CLIENT_PHONE = '+79990000906';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  TRAINER_PHONE,
  OTHER_TRAINER_PHONE,
  CLIENT_PHONE,
  SECOND_CLIENT_PHONE,
  INACTIVE_CLIENT_PHONE,
  OTHER_TRAINER_CLIENT_PHONE,
];

describe('Trainer clients (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerUserId: string;
  let trainerToken: string;
  let clientToken: string;
  let gymId: string;
  let clientId: string;
  let secondClientId: string;
  let inactiveClientId: string;
  let otherTrainerClientId: string;
  let clientUserId: string;
  let secondClientUserId: string;
  let inactiveClientUserId: string;
  let otherTrainerClientUserId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const getClients = (token: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/trainer/clients`)
      .set('Authorization', `Bearer ${token}`);

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

    await prisma.weightMeasurement.deleteMany({
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
    await prisma.gym.deleteMany({ where: { name: 'E2E Clients Gym' } });
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
        name: 'E2E Тренер Клиентов',
      },
    });
    trainerUserId = trainerUser.id;
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });

    const otherTrainerUser = await prisma.user.create({
      data: {
        phone: OTHER_TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Другой тренер клиентов',
      },
    });
    const otherTrainer = await prisma.trainer.create({
      data: { userId: otherTrainerUser.id },
    });

    const gym = await prisma.gym.create({
      data: { name: 'E2E Clients Gym', address: 'ул. Клиентская, 1' },
    });
    gymId = gym.id;

    const makeClient = async (phone: string, name: string) => {
      const user = await prisma.user.create({
        data: { phone, passwordHash, role: Role.CLIENT, name },
      });
      const client = await prisma.client.create({
        data: {
          userId: user.id,
          birthdate: new Date('1995-01-01T00:00:00.000Z'),
        },
      });

      return { user, client };
    };

    const first = await makeClient(CLIENT_PHONE, 'E2E Активный Клиент');
    clientUserId = first.user.id;
    clientId = first.client.id;

    const second = await makeClient(
      SECOND_CLIENT_PHONE,
      'E2E Второй Активный Клиент',
    );
    secondClientUserId = second.user.id;
    secondClientId = second.client.id;

    const inactive = await makeClient(
      INACTIVE_CLIENT_PHONE,
      'E2E Неактивный Клиент',
    );
    inactiveClientUserId = inactive.user.id;
    inactiveClientId = inactive.client.id;

    const otherTrainerClient = await makeClient(
      OTHER_TRAINER_CLIENT_PHONE,
      'E2E Клиент Другого Тренера',
    );
    otherTrainerClientUserId = otherTrainerClient.user.id;
    otherTrainerClientId = otherTrainerClient.client.id;

    await prisma.clientTrainer.createMany({
      data: [
        { clientId, trainerId: trainer.id, gymId },
        { clientId: secondClientId, trainerId: trainer.id, gymId },
        {
          clientId: inactiveClientId,
          trainerId: trainer.id,
          gymId,
          isActive: false,
        },
        {
          clientId: otherTrainerClientId,
          trainerId: otherTrainer.id,
          gymId,
        },
        {
          clientId,
          trainerId: otherTrainer.id,
          gymId,
          isActive: false,
        },
      ],
    });

    await prisma.weightMeasurement.createMany({
      data: [
        {
          clientId,
          measuredBy: trainerUserId,
          measuredAt: new Date('2026-11-01T10:00:00.000Z'),
          weight: 80,
          fatMass: 20,
        },
        {
          clientId,
          measuredBy: trainerUserId,
          measuredAt: new Date('2026-11-05T10:00:00.000Z'),
          weight: 78,
          fatMass: 18,
        },
      ],
    });

    trainerToken = await login(TRAINER_PHONE);
    clientToken = await login(CLIENT_PHONE);
  });

  afterAll(async () => {
    await prisma.weightMeasurement.deleteMany({
      where: { clientId: { in: [clientId, secondClientId] } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { clientId: { in: [clientId, secondClientId, inactiveClientId, otherTrainerClientId] } },
    });
    await prisma.client.deleteMany({
      where: {
        id: {
          in: [
            clientId,
            secondClientId,
            inactiveClientId,
            otherTrainerClientId,
          ],
        },
      },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            trainerUserId,
            clientUserId,
            secondClientUserId,
            inactiveClientUserId,
            otherTrainerClientUserId,
          ],
        },
      },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('GET /trainer/clients без токена → 401', async () => {
    const response = await request(app.getHttpServer()).get(
      `${API_PREFIX}/trainer/clients`,
    );

    expect(response.status).toBe(401);
  });

  it('GET /trainer/clients клиентом → 403', async () => {
    const response = await getClients(clientToken);

    expect(response.status).toBe(403);
  });

  it('GET /trainer/clients возвращает только клиентов с активной связью', async () => {
    const response = await getClients(trainerToken);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(
      response.body.map((client: { id: string }) => client.id).sort(),
    ).toEqual([clientId, secondClientId].sort());

    const ids = response.body.map((client: { id: string }) => client.id);

    expect(ids).not.toContain(inactiveClientId);
    expect(ids).not.toContain(otherTrainerClientId);
  });

  it('GET /trainer/clients не раскрывает телефон клиента', async () => {
    const response = await getClients(trainerToken);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    for (const client of response.body as Record<string, unknown>[]) {
      expect(client).not.toHaveProperty('phone');
      expect(client).not.toHaveProperty('user');
    }

    expect(JSON.stringify(response.body)).not.toContain(CLIENT_PHONE);
    expect(JSON.stringify(response.body)).not.toContain(SECOND_CLIENT_PHONE);
  });

  it('GET /trainer/clients содержит age, currentWeight, currentFatMass', async () => {
    const response = await getClients(trainerToken);
    const first = response.body.find(
      (client: { id: string }) => client.id === clientId,
    );
    const second = response.body.find(
      (client: { id: string }) => client.id === secondClientId,
    );
    const expectedAge = new Date().getUTCFullYear() - 1995;

    expect(first).toMatchObject({
      age: expectedAge,
      currentWeight: 78,
      currentFatMass: 18,
    });
    expect(first.active_trainers).toHaveLength(1);
    expect(first.active_trainers[0].trainerId).toBeDefined();
    expect(second.currentWeight).toBeNull();
    expect(second.currentFatMass).toBeNull();
  });
});
