import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990001101';
const TRAINER_PHONE = '+79990001102';
const CLIENT_A_PHONE = '+79990001103';
const CLIENT_B_PHONE = '+79990001104';
const CLIENT_C_PHONE = '+79990001105';
const CLIENT_D_PHONE = '+79990001106';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  ADMIN_PHONE,
  TRAINER_PHONE,
  CLIENT_A_PHONE,
  CLIENT_B_PHONE,
  CLIENT_C_PHONE,
  CLIENT_D_PHONE,
];
const TITLE_PREFIX = 'E2E Notify';
const GYM_ONE = 'E2E Notification Gym 1';
const GYM_TWO = 'E2E Notification Gym 2';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let trainerId: string;
  let clientAId: string;
  let clientBId: string;
  let clientCId: string;
  let clientDId: string;
  let clientAUserId: string;
  let clientBUserId: string;
  let clientCUserId: string;
  let clientDUserId: string;
  let gymOneId: string;
  let gymTwoId: string;
  let adminToken: string;
  let clientAToken: string;
  let clientBToken: string;
  let clientCToken: string;
  let clientDToken: string;
  let gymNotificationId: string;
  let allNotificationId: string;

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

    await prisma.notificationRecipient.deleteMany({
      where: { notification: { title: { startsWith: TITLE_PREFIX } } },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: TITLE_PREFIX } },
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
    await prisma.gym.deleteMany({ where: { name: { in: [GYM_ONE, GYM_TWO] } } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const adminUser = await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Админ Уведомлений',
      },
    });
    adminId = adminUser.id;

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер Уведомлений',
      },
    });
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    const clientAUser = await prisma.user.create({
      data: {
        phone: CLIENT_A_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент А',
      },
    });
    clientAUserId = clientAUser.id;
    clientAId = (
      await prisma.client.create({ data: { userId: clientAUser.id } })
    ).id;

    const clientBUser = await prisma.user.create({
      data: {
        phone: CLIENT_B_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Б',
      },
    });
    clientBUserId = clientBUser.id;
    clientBId = (
      await prisma.client.create({ data: { userId: clientBUser.id } })
    ).id;

    const clientCUser = await prisma.user.create({
      data: {
        phone: CLIENT_C_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент В',
      },
    });
    clientCUserId = clientCUser.id;
    clientCId = (
      await prisma.client.create({ data: { userId: clientCUser.id } })
    ).id;

    const clientDUser = await prisma.user.create({
      data: {
        phone: CLIENT_D_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент Г',
      },
    });
    clientDUserId = clientDUser.id;
    clientDId = (
      await prisma.client.create({ data: { userId: clientDUser.id } })
    ).id;

    gymOneId = (
      await prisma.gym.create({
        data: { name: GYM_ONE, address: 'ул. Уведомлений, 1' },
      })
    ).id;
    gymTwoId = (
      await prisma.gym.create({
        data: { name: GYM_TWO, address: 'ул. Уведомлений, 2' },
      })
    ).id;

    await prisma.clientTrainer.createMany({
      data: [
        { clientId: clientAId, trainerId, gymId: gymOneId, isActive: true },
        { clientId: clientBId, trainerId, gymId: gymOneId, isActive: false },
        { clientId: clientCId, trainerId, gymId: gymTwoId, isActive: true },
      ],
    });

    adminToken = await login(ADMIN_PHONE);
    clientAToken = await login(CLIENT_A_PHONE);
    clientBToken = await login(CLIENT_B_PHONE);
    clientCToken = await login(CLIENT_C_PHONE);
    clientDToken = await login(CLIENT_D_PHONE);
  });

  afterAll(async () => {
    await prisma.notificationRecipient.deleteMany({
      where: {
        OR: [
          { notification: { title: { startsWith: TITLE_PREFIX } } },
          { userId: { in: [clientAUserId, clientBUserId, clientCUserId, clientDUserId] } },
        ],
      },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: TITLE_PREFIX } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { clientId: { in: [clientAId, clientBId, clientCId, clientDId] } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: [clientAId, clientBId, clientCId, clientDId] } },
    });
    await prisma.trainer.deleteMany({ where: { id: trainerId } });
    await prisma.gym.deleteMany({
      where: { id: { in: [gymOneId, gymTwoId] } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId] } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /admin/notifications с gym_id создаёт получателей только у активных клиентов зала', async () => {
    const response = await authed(adminToken)
      .post('/admin/notifications')
      .send({
        title: `${TITLE_PREFIX} Gym`,
        body: 'Только для клиентов зала 1',
        gym_id: gymOneId,
      });

    expect(response.status).toBe(201);
    expect(response.body.gymId).toBe(gymOneId);
    gymNotificationId = response.body.id as string;

    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId: gymNotificationId },
    });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].userId).toBe(clientAUserId);
  });

  it('POST /admin/notifications без gym_id создаёт получателей у всех клиентов', async () => {
    const response = await authed(adminToken)
      .post('/admin/notifications')
      .send({
        title: `${TITLE_PREFIX} All`,
        body: 'Всем клиентам',
      });

    expect(response.status).toBe(201);
    expect(response.body.gymId).toBeNull();
    allNotificationId = response.body.id as string;

    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId: allNotificationId },
    });
    const recipientIds = recipients.map((item) => item.userId);

    expect(recipientIds).toEqual(
      expect.arrayContaining([
        clientAUserId,
        clientBUserId,
        clientCUserId,
        clientDUserId,
      ]),
    );
  });

  it('GET /notifications возвращает только уведомления пользователя', async () => {
    const response = await authed(clientAToken).get('/notifications');

    expect(response.status).toBe(200);
    expect(
      response.body.map((item: { id: string }) => item.id),
    ).toEqual(expect.arrayContaining([gymNotificationId, allNotificationId]));
  });

  it('GET /notifications не показывает уведомление чужого зала', async () => {
    const response = await authed(clientBToken).get('/notifications');

    expect(response.status).toBe(200);
    expect(
      response.body.map((item: { id: string }) => item.id),
    ).toContain(allNotificationId);
    expect(
      response.body.map((item: { id: string }) => item.id),
    ).not.toContain(gymNotificationId);
  });

  it('POST /notifications/:id/read отмечает уведомление прочитанным', async () => {
    const readResponse = await authed(clientAToken).post(
      `/notifications/${gymNotificationId}/read`,
    );

    expect(readResponse.status).toBe(204);

    const response = await authed(clientAToken).get('/notifications');
    const notification = response.body.find(
      (item: { id: string }) => item.id === gymNotificationId,
    );

    expect(notification.readAt).not.toBeNull();
  });

  it('POST /notifications/:id/read идемпотентен', async () => {
    const response = await authed(clientAToken).post(
      `/notifications/${gymNotificationId}/read`,
    );

    expect(response.status).toBe(204);
  });

  it('POST /notifications/:id/read чужого уведомления → 404', async () => {
    const response = await authed(clientBToken).post(
      `/notifications/${gymNotificationId}/read`,
    );

    expect(response.status).toBe(404);
  });

  it('POST /admin/notifications клиентом → 403', async () => {
    const response = await authed(clientDToken)
      .post('/admin/notifications')
      .send({ title: `${TITLE_PREFIX} Denied`, body: 'Нельзя' });

    expect(response.status).toBe(403);
  });

  it('POST /admin/notifications с несуществующим gym_id → 404', async () => {
    const response = await authed(adminToken)
      .post('/admin/notifications')
      .send({
        title: `${TITLE_PREFIX} Unknown Gym`,
        body: 'Нет зала',
        gym_id: '00000000-0000-4000-8000-000000000000',
      });

    expect(response.status).toBe(404);
  });

  it('GET /notifications админом → 403', async () => {
    const response = await authed(adminToken).get('/notifications');

    expect(response.status).toBe(403);
  });
});
