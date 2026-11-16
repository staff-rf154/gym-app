import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, WorkoutStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AddressInfo } from 'node:net';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

const API_PREFIX = '/api/v1';
const TRAINER_PHONE = '+79990002201';
const CLIENT_PHONE = '+79990002202';
const OTHER_CLIENT_PHONE = '+79990002203';
const TEST_PASSWORD = 'TestPass123!';
const PHONES = [TRAINER_PHONE, CLIENT_PHONE, OTHER_CLIENT_PHONE];

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
}

interface JoinResult {
  joined: boolean;
}

interface SendResult {
  ok: boolean;
  message?: ChatMessage;
}

describe('Chat WebSocket (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let trainerId: string;
  let clientId: string;
  let otherClientId: string;
  let trainerUserId: string;
  let clientUserId: string;
  let otherClientUserId: string;
  let chatId: string;
  let foreignChatId: string;
  let trainerSocket: Socket;
  let clientSocket: Socket;

  const login = async (phone: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, password: TEST_PASSWORD });

    return response.body.access_token as string;
  };

  const connect = (token: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(`${baseUrl}/chat`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });

      const cleanup = (): void => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };
      const onConnect = (): void => {
        cleanup();
        resolve(socket);
      };
      const onError = (error: Error): void => {
        cleanup();
        socket.close();
        reject(error);
      };

      socket.on('connect', onConnect);
      socket.on('connect_error', onError);
    });

  const emitAck = <T>(
    socket: Socket,
    event: string,
    payload: unknown,
  ): Promise<T> =>
    new Promise((resolve) => {
      socket.emit(event, payload, (response: T) => resolve(response));
    });

  const waitForMessage = (
    socket: Socket,
    predicate: (message: ChatMessage) => boolean,
  ): Promise<ChatMessage> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off('chat:message', handler);
        reject(new Error('Timed out waiting for chat:message'));
      }, 3000);

      const handler = (message: ChatMessage): void => {
        if (predicate(message)) {
          clearTimeout(timer);
          socket.off('chat:message', handler);
          resolve(message);
        }
      };

      socket.on('chat:message', handler);
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    prisma = app.get(PrismaService);

    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { client: { user: { phone: { in: PHONES } } } } } },
    });
    await prisma.workoutItem.deleteMany({
      where: { workout: { client: { user: { phone: { in: PHONES } } } } },
    });
    await prisma.workout.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.message.deleteMany({
      where: { chat: { OR: [{ client: { user: { phone: { in: PHONES } } } }, { trainer: { user: { phone: { in: PHONES } } } }] } },
    });
    await prisma.chat.deleteMany({
      where: { OR: [{ client: { user: { phone: { in: PHONES } } } }, { trainer: { user: { phone: { in: PHONES } } } }] },
    });
    await prisma.clientTrainer.deleteMany({
      where: { OR: [{ client: { user: { phone: { in: PHONES } } } }, { trainer: { user: { phone: { in: PHONES } } } }] },
    });
    await prisma.clientGym.deleteMany({
      where: { client: { user: { phone: { in: PHONES } } } },
    });
    await prisma.trainerGym.deleteMany({
      where: { trainer: { user: { phone: { in: PHONES } } } },
    });
    await prisma.client.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.trainer.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.gym.deleteMany({ where: { name: 'E2E Chat WS Gym' } });
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
        name: 'E2E Тренер WS',
      },
    });
    trainerUserId = trainerUser.id;
    trainerId = (
      await prisma.trainer.create({ data: { userId: trainerUser.id } })
    ).id;

    const clientUser = await prisma.user.create({
      data: {
        phone: CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Клиент WS',
      },
    });
    clientUserId = clientUser.id;
    clientId = (
      await prisma.client.create({ data: { userId: clientUser.id } })
    ).id;

    const otherClientUser = await prisma.user.create({
      data: {
        phone: OTHER_CLIENT_PHONE,
        passwordHash,
        role: Role.CLIENT,
        name: 'E2E Другой клиент WS',
      },
    });
    otherClientUserId = otherClientUser.id;
    otherClientId = (
      await prisma.client.create({ data: { userId: otherClientUser.id } })
    ).id;

    const gym = await prisma.gym.create({
      data: { name: 'E2E Chat WS Gym', address: 'ул. Чатовая, 1' },
    });
    await prisma.trainerGym.create({
      data: { trainerId, gymId: gym.id },
    });
    await prisma.clientGym.create({
      data: { clientId, gymId: gym.id },
    });
    await prisma.clientTrainer.create({
      data: { clientId, trainerId, gymId: gym.id },
    });

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await prisma.workout.create({
      data: {
        clientId,
        trainerId,
        gymId: gym.id,
        date: new Date(`${tomorrow.toISOString().slice(0, 10)}T00:00:00.000Z`),
        status: WorkoutStatus.PLANNED,
      },
    });

    chatId = (
      await prisma.chat.create({
        data: { type: 'CLIENT_TRAINER', clientId, trainerId },
      })
    ).id;
    foreignChatId = (
      await prisma.chat.create({
        data: {
          type: 'CLIENT_TRAINER',
          clientId: otherClientId,
          trainerId,
        },
      })
    ).id;

    const trainerToken = await login(TRAINER_PHONE);
    const clientToken = await login(CLIENT_PHONE);

    trainerSocket = await connect(trainerToken);
    clientSocket = await connect(clientToken);
  });

  afterAll(async () => {
    trainerSocket?.close();
    clientSocket?.close();
    await prisma.workoutItemResult.deleteMany({
      where: { item: { workout: { clientId } } },
    });
    await prisma.workoutItem.deleteMany({ where: { workout: { clientId } } });
    await prisma.workout.deleteMany({ where: { clientId } });
    await prisma.message.deleteMany({
      where: { chatId: { in: [chatId, foreignChatId] } },
    });
    await prisma.chat.deleteMany({
      where: { id: { in: [chatId, foreignChatId] } },
    });
    await prisma.clientTrainer.deleteMany({ where: { clientId } });
    await prisma.clientGym.deleteMany({ where: { clientId } });
    await prisma.trainerGym.deleteMany({ where: { trainerId } });
    await prisma.client.deleteMany({
      where: { id: { in: [clientId, otherClientId] } },
    });
    await prisma.trainer.deleteMany({ where: { id: trainerId } });
    await prisma.gym.deleteMany({ where: { name: 'E2E Chat WS Gym' } });
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { in: PHONES } } },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [trainerUserId, clientUserId, otherClientUserId] },
      },
    });
    await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('chat:join участника чата → joined: true', async () => {
    const clientResult = await emitAck<JoinResult>(clientSocket, 'chat:join', {
      chatId,
    });
    const trainerResult = await emitAck<JoinResult>(
      trainerSocket,
      'chat:join',
      { chatId },
    );

    expect(clientResult).toEqual({ joined: true });
    expect(trainerResult).toEqual({ joined: true });
  });

  it('chat:join чужого чата → joined: false', async () => {
    const result = await emitAck<JoinResult>(clientSocket, 'chat:join', {
      chatId: foreignChatId,
    });

    expect(result).toEqual({ joined: false });
  });

  it('chat:send от тренера доходит до клиента событием chat:message', async () => {
    const text = 'Привет из e2e WebSocket';
    const received = waitForMessage(
      clientSocket,
      (message) => message.chatId === chatId && message.text === text,
    );

    const result = await emitAck<SendResult>(trainerSocket, 'chat:send', {
      chatId,
      text,
    });

    expect(result.ok).toBe(true);
    expect(result.message?.text).toBe(text);

    const message = await received;
    expect(message.senderId).toBe(trainerUserId);
    expect(message.chatId).toBe(chatId);
  });

  it('после chat:leave событие в комнату не приходит', async () => {
    const leaveResult = await emitAck<{ left: boolean }>(
      clientSocket,
      'chat:leave',
      { chatId },
    );
    expect(leaveResult).toEqual({ left: true });

    const received: ChatMessage[] = [];
    const handler = (message: ChatMessage): void => {
      if (message.chatId === chatId) {
        received.push(message);
      }
    };
    clientSocket.on('chat:message', handler);

    const result = await emitAck<SendResult>(trainerSocket, 'chat:send', {
      chatId,
      text: 'Сообщение после выхода',
    });
    expect(result.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    clientSocket.off('chat:message', handler);
    expect(received).toHaveLength(0);
  });
});
