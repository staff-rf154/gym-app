import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990003301';
const PUSH_CLIENT_PHONE = '+79990003302';
const NO_TOKEN_CLIENT_PHONE = '+79990003303';
const OTHER_GYM_CLIENT_PHONE = '+79990003304';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  ADMIN_PHONE,
  PUSH_CLIENT_PHONE,
  NO_TOKEN_CLIENT_PHONE,
  OTHER_GYM_CLIENT_PHONE,
];
const TITLE_PREFIX = 'E2E FCM';
const GYM_WITH_TOKEN = 'E2E FCM Gym With Token';
const GYM_WITHOUT_TOKEN = 'E2E FCM Gym Without Token';
const GYM_OTHER = 'E2E FCM Other Gym';
const PUSH_TOKEN = 'e2e-fcm-token-1';

describe('Notifications FCM dispatch (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: string;
  let pushClientId: string;
  let pushClientUserId: string;
  let noTokenClientId: string;
  let noTokenClientUserId: string;
  let otherGymClientId: string;
  let otherGymClientUserId: string;
  let trainerId: string;
  let gymWithTokenId: string;
  let gymWithoutTokenId: string;
  let gymOtherId: string;
  let adminToken: string;
  let sendToUsersMock: jest.Mock;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const createNotification = (gymId: string) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/admin/notifications`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `${TITLE_PREFIX} ${gymId}`,
        body: 'Проверка FCM-диспетчеризации',
        gym_id: gymId,
      });

  beforeAll(async () => {
    sendToUsersMock = jest.fn().mockResolvedValue(undefined);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PushService)
      .useValue({ sendToUsers: sendToUsersMock })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.notificationRecipient.deleteMany({
      where: { notification: { title: { startsWith: TITLE_PREFIX } } },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: TITLE_PREFIX } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({
      where: {
        name: { in: [GYM_WITH_TOKEN, GYM_WITHOUT_TOKEN, GYM_OTHER] },
      },
    });
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
        name: 'E2E FCM Админ',
      },
    });
    adminId = adminUser.id;

    const pushClientUser = await prisma.user.create({
      data: {
        phone: PUSH_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E FCM Клиент с токеном',
        pushToken: PUSH_TOKEN,
      },
    });
    pushClientUserId = pushClientUser.id;
    pushClientId = (
      await prisma.client.create({ data: { userId: pushClientUser.id } })
    ).id;

    const noTokenClientUser = await prisma.user.create({
      data: {
        phone: NO_TOKEN_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E FCM Клиент без токена',
      },
    });
    noTokenClientUserId = noTokenClientUser.id;
    noTokenClientId = (
      await prisma.client.create({ data: { userId: noTokenClientUser.id } })
    ).id;

    const otherGymClientUser = await prisma.user.create({
      data: {
        phone: OTHER_GYM_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E FCM Клиент другого зала',
        pushToken: 'e2e-fcm-token-other',
      },
    });
    otherGymClientUserId = otherGymClientUser.id;
    otherGymClientId = (
      await prisma.client.create({ data: { userId: otherGymClientUser.id } })
    ).id;

    const trainerUser = await prisma.user.create({
      data: {
        phone: '+79990003305',
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E FCM Тренер',
      },
    });
    PHONES.push(trainerUser.phone);
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUser.id } })
    ).id;

    gymWithTokenId = (
      await prisma.gym.create({
        data: { name: GYM_WITH_TOKEN, address: 'ул. FCM, 1' },
      })
    ).id;
    gymWithoutTokenId = (
      await prisma.gym.create({
        data: { name: GYM_WITHOUT_TOKEN, address: 'ул. FCM, 2' },
      })
    ).id;
    gymOtherId = (
      await prisma.gym.create({
        data: { name: GYM_OTHER, address: 'ул. FCM, 3' },
      })
    ).id;

    await prisma.clientTrainer.createMany({
      data: [
        {
          clientId: pushClientId,
          trainerId,
          gymId: gymWithTokenId,
          isActive: true,
        },
        {
          clientId: noTokenClientId,
          trainerId,
          gymId: gymWithTokenId,
          isActive: true,
        },
        {
          clientId: noTokenClientId,
          trainerId,
          gymId: gymWithoutTokenId,
          isActive: true,
        },
        {
          clientId: otherGymClientId,
          trainerId,
          gymId: gymOtherId,
          isActive: true,
        },
      ],
    });

    adminToken = await login(ADMIN_PHONE);
  });

  afterAll(async () => {
    await prisma.notificationRecipient.deleteMany({
      where: { notification: { title: { startsWith: TITLE_PREFIX } } },
    });
    await prisma.notification.deleteMany({
      where: { title: { startsWith: TITLE_PREFIX } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        clientId: {
          in: [pushClientId, noTokenClientId, otherGymClientId],
        },
      },
    });
    await prisma.client.deleteMany({
      where: {
        id: { in: [pushClientId, noTokenClientId, otherGymClientId] },
      },
    });
    await prisma.trainer.deleteMany({ where: { id: trainerId } });
    await prisma.gym.deleteMany({
      where: {
        id: { in: [gymWithTokenId, gymWithoutTokenId, gymOtherId] },
      },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            adminId,
            pushClientUserId,
            noTokenClientUserId,
            otherGymClientUserId,
          ],
        },
      },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('push вызывается только для клиентов целевой группы с pushToken', async () => {
    sendToUsersMock.mockClear();

    const response = await createNotification(gymWithTokenId);

    expect(response.status).toBe(201);

    expect(sendToUsersMock).toHaveBeenCalledTimes(1);
    expect(sendToUsersMock).toHaveBeenCalledWith(
      [pushClientUserId],
      expect.stringContaining(TITLE_PREFIX),
      'Проверка FCM-диспетчеризации',
    );

    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId: response.body.id as string },
    });
    const recipientIds = recipients.map((item) => item.userId);

    expect(recipientIds).toEqual(
      expect.arrayContaining([pushClientUserId, noTokenClientUserId]),
    );
    expect(recipientIds).not.toContain(otherGymClientUserId);
  });

  it('без pushToken push не вызывается, NotificationRecipient создан', async () => {
    sendToUsersMock.mockClear();

    const response = await createNotification(gymWithoutTokenId);

    expect(response.status).toBe(201);
    expect(sendToUsersMock).not.toHaveBeenCalled();

    const recipients = await prisma.notificationRecipient.findMany({
      where: { notificationId: response.body.id as string },
    });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].userId).toBe(noTokenClientUserId);
  });
});
