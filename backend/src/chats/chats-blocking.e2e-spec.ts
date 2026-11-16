import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990002301';
const FUTURE_CLIENT_PHONE = '+79990002302';
const STALE_CLIENT_PHONE = '+79990002303';
const FRESH_CLIENT_PHONE = '+79990002304';
const EMPTY_CLIENT_PHONE = '+79990002305';
const UNLINKED_CLIENT_PHONE = '+79990002306';
const ADMIN_PHONE = '+79990002307';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [
  TRAINER_PHONE,
  FUTURE_CLIENT_PHONE,
  STALE_CLIENT_PHONE,
  FRESH_CLIENT_PHONE,
  EMPTY_CLIENT_PHONE,
  UNLINKED_CLIENT_PHONE,
  ADMIN_PHONE,
];

interface ChatItem {
  id: string;
  peerId: string;
  isBlocked: boolean;
}

interface ChatsPage {
  items: ChatItem[];
}

describe('Chat blocking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainerId: string;
  let trainerUserId: string;
  let gymId: string;
  let trainerToken: string;
  let futureToken: string;
  let staleToken: string;
  let emptyToken: string;
  let unlinkedToken: string;
  let adminToken: string;
  let futureClientId: string;
  let staleClientId: string;
  let freshClientId: string;
  let emptyClientId: string;
  let unlinkedClientId: string;
  let futureChatId: string;
  let staleChatId: string;
  let freshChatId: string;
  let emptyChatId: string;
  let unlinkedChatId: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const dateOffset = (days: number): Date => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
  };

  const getChats = (token: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/chats?limit=50`)
      .set('Authorization', `Bearer ${token}`);

  const sendMessage = (token: string, chatId: string, text: string) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/chats/${chatId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text });

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

    await prisma.message.deleteMany({
      where: {
        chat: {
          OR: [
            { client: { user: { phone: { in: PHONES } } } },
            { trainer: { user: { phone: { in: PHONES } } } },
          ],
        },
      },
    });
    await prisma.chat.deleteMany({
      where: {
        OR: [
          { client: { user: { phone: { in: PHONES } } } },
          { trainer: { user: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.workout.deleteMany({
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
    await prisma.gym.deleteMany({ where: { name: 'E2E Chat Blocking Gym' } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.notificationRecipient.deleteMany({
      where: {
        OR: [
          { user: { phone: { in: PHONES } } },
          { notification: { sender: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.notification.deleteMany({
      where: { sender: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const trainerUser = await prisma.user.create({
      data: {
        phone: TRAINER_PHONE,
        passwordHash,
        role: Role.TRAINER,
        name: 'E2E Тренер блокировки',
        timezone: 'Europe/Moscow',
      },
    });
    trainerUserId = trainerUser.id;

    await prisma.user.create({
      data: {
        phone: ADMIN_PHONE,
        passwordHash,
        role: Role.ADMIN,
        name: 'E2E Администратор чатов',
        timezone: 'Europe/Moscow',
      },
    });
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUser.id } })
    ).id;

    gymId = (
      await prisma.gym.create({
        data: { name: 'E2E Chat Blocking Gym', address: 'ул. Блокировки, 1' },
      })
    ).id;

    const makeClient = async (phone: string, name: string): Promise<string> => {
      const user = await prisma.user.create({
        data: {
          phone,
          passwordHash,
          role: Role.CLIENT,
          name,
          timezone: 'Europe/Moscow',
        },
      });
      const client = await prisma.client.create({
        data: { userId: user.id },
      });

      return client.id;
    };

    futureClientId = await makeClient(
      FUTURE_CLIENT_PHONE,
      'E2E Будущая тренировка',
    );
    staleClientId = await makeClient(STALE_CLIENT_PHONE, 'E2E Старый клиент');
    freshClientId = await makeClient(FRESH_CLIENT_PHONE, 'E2E Свежий клиент');
    emptyClientId = await makeClient(EMPTY_CLIENT_PHONE, 'E2E Без истории');
    unlinkedClientId = await makeClient(
      UNLINKED_CLIENT_PHONE,
      'E2E Без связи',
    );

    for (const clientId of [
      futureClientId,
      staleClientId,
      freshClientId,
      emptyClientId,
    ]) {
      await prisma.clientTrainer.create({
        data: { clientId, trainerId, gymId },
      });
    }

    await prisma.workout.create({
      data: {
        clientId: futureClientId,
        trainerId,
        gymId,
        date: dateOffset(1),
        status: WorkoutStatus.PLANNED,
      },
    });
    await prisma.workout.create({
      data: {
        clientId: staleClientId,
        trainerId,
        gymId,
        date: dateOffset(-15),
        status: WorkoutStatus.COMPLETED,
      },
    });
    await prisma.workout.create({
      data: {
        clientId: freshClientId,
        trainerId,
        gymId,
        date: dateOffset(-3),
        status: WorkoutStatus.COMPLETED,
      },
    });
    await prisma.workout.create({
      data: {
        clientId: unlinkedClientId,
        trainerId,
        gymId,
        date: dateOffset(1),
        status: WorkoutStatus.PLANNED,
      },
    });

    const makeChat = async (clientId: string): Promise<string> =>
      (
        await prisma.chat.create({
          data: { type: 'CLIENT_TRAINER', clientId, trainerId },
        })
      ).id;

    futureChatId = await makeChat(futureClientId);
    staleChatId = await makeChat(staleClientId);
    freshChatId = await makeChat(freshClientId);
    emptyChatId = await makeChat(emptyClientId);
    unlinkedChatId = await makeChat(unlinkedClientId);

    trainerToken = await login(TRAINER_PHONE);
    futureToken = await login(FUTURE_CLIENT_PHONE);
    staleToken = await login(STALE_CLIENT_PHONE);
    emptyToken = await login(EMPTY_CLIENT_PHONE);
    unlinkedToken = await login(UNLINKED_CLIENT_PHONE);
    adminToken = await login(ADMIN_PHONE);
  });

  afterAll(async () => {
    const clients = await prisma.client.findMany({
      where: { user: { phone: { in: PHONES } } },
      select: { id: true },
    });
    const clientIds = clients.map((client) => client.id);

    await prisma.message.deleteMany({
      where: { chatId: { in: [futureChatId, staleChatId, freshChatId, emptyChatId, unlinkedChatId] } },
    });
    await prisma.chat.deleteMany({
      where: { id: { in: [futureChatId, staleChatId, freshChatId, emptyChatId, unlinkedChatId] } },
    });
    await prisma.workout.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    await prisma.clientTrainer.deleteMany({
      where: { client: { id: { in: clientIds } } },
    });
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
    await prisma.trainer.deleteMany({ where: { id: trainerId } });
    await prisma.gym.deleteMany({ where: { id: gymId } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.notificationRecipient.deleteMany({
      where: {
        OR: [
          { user: { phone: { in: PHONES } } },
          { notification: { sender: { phone: { in: PHONES } } } },
        ],
      },
    });
    await prisma.notification.deleteMany({
      where: { sender: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('тренер не может выдать другого пользователя за ADMIN при создании чата', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/chats`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ type: 'TRAINER_ADMIN', admin_id: trainerUserId });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('admin');
  });

  it('GET /chats администратором → видит все чаты клиентов и тренеров', async () => {
    const response = await getChats(adminToken);

    expect(response.status).toBe(200);
    const ids = (response.body as ChatsPage).items.map((chat) => chat.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        futureChatId,
        staleChatId,
        freshChatId,
        emptyChatId,
        unlinkedChatId,
      ]),
    );
  });

  it('GET /chats тренером → isBlocked по будущим, старым и пустым клиентам', async () => {
    const response = await getChats(trainerToken);

    expect(response.status).toBe(200);

    const byId = new Map<string, boolean>(
      (response.body as ChatsPage).items.map((chat) => [
        chat.id,
        chat.isBlocked,
      ]),
    );

    expect(byId.get(futureChatId)).toBe(false);
    expect(byId.get(freshChatId)).toBe(false);
    expect(byId.get(staleChatId)).toBe(true);
    expect(byId.get(emptyChatId)).toBe(true);
    expect(byId.get(unlinkedChatId)).toBe(true);
  });

  it('GET /chats клиентом → isBlocked для своего чата', async () => {
    const future = await getChats(futureToken);
    const stale = await getChats(staleToken);

    expect(future.status).toBe(200);
    expect(stale.status).toBe(200);

    expect(
      (future.body as ChatsPage).items.find(
        (chat) => chat.id === futureChatId,
      )?.isBlocked,
    ).toBe(false);
    expect(
      (stale.body as ChatsPage).items.find((chat) => chat.id === staleChatId)
        ?.isBlocked,
    ).toBe(true);
  });

  it('клиент не может писать в заблокированный чат → 403', async () => {
    const response = await sendMessage(
      staleToken,
      staleChatId,
      'Сообщение в старый чат',
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('blocked');
  });

  it('тренер не может писать в заблокированный чат → 403', async () => {
    const response = await sendMessage(
      trainerToken,
      staleChatId,
      'Сообщение тренера в старый чат',
    );

    expect(response.status).toBe(403);
  });

  it('в чат с будущей тренировкой сообщение отправляется → 201', async () => {
    const response = await sendMessage(
      futureToken,
      futureChatId,
      'Сообщение в активный чат',
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ chatId: futureChatId });
  });

  it('новая будущая тренировка разблокирует чат со старым клиентом', async () => {
    await prisma.workout.create({
      data: {
        clientId: staleClientId,
        trainerId,
        gymId,
        date: dateOffset(2),
        status: WorkoutStatus.PLANNED,
      },
    });

    const response = await sendMessage(
      staleToken,
      staleChatId,
      'Сообщение после разблокировки',
    );

    expect(response.status).toBe(201);
  });

  it('чат без истории тренировок заблокирован → 403', async () => {
    const response = await sendMessage(
      emptyToken,
      emptyChatId,
      'Сообщение без истории',
    );

    expect(response.status).toBe(403);
  });

  it('чат без активной связи клиент-тренер заблокирован → 403', async () => {
    const response = await sendMessage(
      unlinkedToken,
      unlinkedChatId,
      'Сообщение без связи',
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('inactive');
  });
});
