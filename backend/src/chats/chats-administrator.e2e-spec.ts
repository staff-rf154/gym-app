import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const ADMIN_PHONE = '+79990002501';
const ADMINISTRATOR_A_PHONE = '+79990002502';
const ADMINISTRATOR_B_PHONE = '+79990002503';
const CLIENT_A_PHONE = '+79990002504';
const CLIENT_B_PHONE = '+79990002505';
const TRAINER_PHONE = '+79990002506';
const TEST_PASSWORD = 'TestPass123!';
const GYM_NAMES = ['E2E Chat Administrator Gym A', 'E2E Chat Administrator Gym B'];
const PHONES = [
  ADMIN_PHONE,
  ADMINISTRATOR_A_PHONE,
  ADMINISTRATOR_B_PHONE,
  CLIENT_A_PHONE,
  CLIENT_B_PHONE,
  TRAINER_PHONE,
];

interface ChatItem {
  id: string;
  unreadCount: number;
}

interface ChatsPage {
  items: ChatItem[];
}

describe('Administrator chats (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let administratorAUserId: string;
  let administratorBUserId: string;
  let clientAId: string;
  let clientBId: string;
  let trainerId: string;
  let clientAToken: string;
  let clientBToken: string;
  let administratorAToken: string;
  let administratorBToken: string;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const createChat = (token: string, body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/chats`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const getChats = (token: string) =>
    request(app.getHttpServer())
      .get(`${API_PREFIX}/chats?limit=50`)
      .set('Authorization', `Bearer ${token}`);

  const sendMessage = (token: string, chatId: string, text: string) =>
    request(app.getHttpServer())
      .post(`${API_PREFIX}/chats/${chatId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ text });

  const cleanup = async () => {
    await prisma.message.deleteMany({
      where: {
        chat: {
          OR: [
            { client: { user: { phone: { in: PHONES } } } },
            { trainer: { user: { phone: { in: PHONES } } } },
            { admin: { phone: { in: PHONES } } },
          ],
        },
      },
    });
    await prisma.chat.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.chat.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.chat.deleteMany({
      where: { admin: { phone: { in: PHONES } } },
    });
    await prisma.notificationRecipient.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.notification.deleteMany({
      where: { sender: { phone: { in: PHONES } } },
    });
    await prisma.clientTrainer.deleteMany({
      where: {
        OR: [
          { client: { user: { phone: { in: PHONES } } } },
          { trainer: { user: { phone: { in: PHONES } } } },
        ],
      },
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
    await prisma.gymEquipment.deleteMany({
      where: { gym: { name: { in: GYM_NAMES } } },
    });
    await prisma.gym.deleteMany({
      where: { name: { in: GYM_NAMES } },
    });
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
    const createUser = (
      phone: string,
      role: Role,
      name: string,
    ) =>
      prisma.user.create({
        data: { phone, passwordHash, role, name, timezone: 'Europe/Moscow' },
      });

    await createUser(ADMIN_PHONE, Role.ADMIN, 'E2E Админ');
    const administratorAUser = await createUser(
      ADMINISTRATOR_A_PHONE,
      Role.ADMINISTRATOR,
      'E2E Администратор A',
    );
    administratorAUserId = administratorAUser.id;
    const administratorBUser = await createUser(
      ADMINISTRATOR_B_PHONE,
      Role.ADMINISTRATOR,
      'E2E Администратор B',
    );
    administratorBUserId = administratorBUser.id;
    const clientAUser = await createUser(
      CLIENT_A_PHONE,
      Role.CLIENT,
      'E2E Клиент A',
    );
    const clientBUser = await createUser(
      CLIENT_B_PHONE,
      Role.CLIENT,
      'E2E Клиент B',
    );
    const trainerUser = await createUser(
      TRAINER_PHONE,
      Role.TRAINER,
      'E2E Тренер',
    );

    const gymA = await prisma.gym.create({
      data: { name: GYM_NAMES[0], address: 'ул. A, 1' },
    });
    const gymB = await prisma.gym.create({
      data: { name: GYM_NAMES[1], address: 'ул. B, 1' },
    });

    await prisma.administrator.create({
      data: { userId: administratorAUser.id, gymId: gymA.id },
    });
    await prisma.administrator.create({
      data: { userId: administratorBUser.id, gymId: gymB.id },
    });

    const clientA = await prisma.client.create({
      data: { userId: clientAUser.id },
    });
    clientAId = clientA.id;
    const clientB = await prisma.client.create({
      data: { userId: clientBUser.id },
    });
    clientBId = clientB.id;
    const trainer = await prisma.trainer.create({
      data: { userId: trainerUser.id },
    });
    trainerId = trainer.id;

    await prisma.clientGym.create({
      data: { clientId: clientA.id, gymId: gymA.id },
    });
    await prisma.trainerGym.create({
      data: { trainerId: trainer.id, gymId: gymA.id },
    });

    clientAToken = await login(CLIENT_A_PHONE);
    clientBToken = await login(CLIENT_B_PHONE);
    administratorAToken = await login(ADMINISTRATOR_A_PHONE);
    administratorBToken = await login(ADMINISTRATOR_B_PHONE);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('allows administrator to list chats', async () => {
    await getChats(administratorAToken).expect(200);
  });

  it('routes a client chat to the administrator of the client gym', async () => {
    const response = await createChat(clientAToken, {
      type: ChatType.CLIENT_ADMIN,
    }).expect(201);

    const chat = await prisma.chat.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });
    expect(chat.adminId).toBe(administratorAUserId);
    expect(chat.clientId).toBe(clientAId);
    expect(chat.type).toBe(ChatType.CLIENT_ADMIN);

    const chats = await getChats(administratorAToken).expect(200);
    const items = (chats.body as ChatsPage).items;
    expect(items.some((item) => item.id === chat.id)).toBe(true);
  });

  it('shows unread client message to administrator', async () => {
    const response = await createChat(clientAToken, {
      type: ChatType.CLIENT_ADMIN,
    }).expect(201);
    const chatId = response.body.id as string;

    await sendMessage(clientAToken, chatId, 'Здравствуйте').expect(201);

    const chats = await getChats(administratorAToken).expect(200);
    const item = (chats.body as ChatsPage).items.find(
      (chat) => chat.id === chatId,
    );
    expect(item?.unreadCount).toBe(1);
  });

  it('falls back to an admin when the client has no gym', async () => {
    const response = await createChat(clientBToken, {
      type: ChatType.CLIENT_ADMIN,
    }).expect(201);

    const chat = await prisma.chat.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { id: chat.adminId as string },
    });
    expect(admin.role).toBe(Role.ADMIN);
    expect(chat.clientId).toBe(clientBId);
  });

  it('forbids administrator from messaging a client of another gym', async () => {
    await createChat(administratorAToken, {
      type: ChatType.CLIENT_ADMIN,
      client_id: clientBId,
    }).expect(403);

    await createChat(administratorBToken, {
      type: ChatType.CLIENT_ADMIN,
      client_id: clientAId,
    }).expect(403);
  });

  it('allows administrator to create a chat with a trainer of the same gym', async () => {
    const response = await createChat(administratorAToken, {
      type: ChatType.TRAINER_ADMIN,
      trainer_id: trainerId,
    }).expect(201);

    const chat = await prisma.chat.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });
    expect(chat.adminId).toBe(administratorAUserId);
    expect(chat.trainerId).toBe(trainerId);
    expect(chat.type).toBe(ChatType.TRAINER_ADMIN);
  });
});
