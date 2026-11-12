import {
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { ChatEvents } from './chat-events.service';
import { ChatsService } from './chats.service';
import { SendMessageDto } from './dto/message.dto';

interface JwtPayload {
  sub: string;
  role: Role;
}

const WS_SEND_WINDOW_MS = 10_000;
const WS_SEND_LIMIT = 20;

function getWsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: getWsOrigins(), credentials: true },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private subscription?: Subscription;

  private readonly sendTimestamps = new Map<string, number[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatsService: ChatsService,
    private readonly chatEvents: ChatEvents,
  ) {}

  onModuleInit(): void {
    this.subscription = this.chatEvents.message$.subscribe((message) => {
      this.server
        .to(`chat:${message.chatId}`)
        .emit('chat:message', message);
    });
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.sendTimestamps.delete(client.id);
    // Socket.IO removes the client from all rooms automatically.
  }

  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string },
  ): Promise<{ joined: boolean }> {
    const userId = client.data.userId as string | undefined;
    const chatId = body?.chatId;

    if (!userId || !chatId) {
      return { joined: false };
    }

    if (!(await this.chatsService.isParticipant(userId, chatId))) {
      return { joined: false };
    }

    await client.join(`chat:${chatId}`);

    return { joined: true };
  }

  @SubscribeMessage('chat:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string },
  ): Promise<{ left: boolean }> {
    if (!body?.chatId) {
      return { left: false };
    }

    await client.leave(`chat:${body.chatId}`);

    return { left: true };
  }

  @SubscribeMessage('chat:send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: string; text?: string },
  ) {
    const userId = client.data.userId as string | undefined;

    if (!userId || !body?.chatId) {
      return { ok: false };
    }

    const dto = plainToInstance(SendMessageDto, { text: body.text });
    const errors = await validate(dto);

    if (errors.length > 0) {
      return { ok: false };
    }

    if (!this.allowSend(client.id)) {
      return { ok: false };
    }

    try {
      const message = await this.chatsService.sendMessage(userId, body.chatId, {
        text: dto.text,
      });

      return { ok: true, message };
    } catch {
      return { ok: false };
    }
  }

  private allowSend(socketId: string): boolean {
    const now = Date.now();
    const timestamps = (this.sendTimestamps.get(socketId) ?? []).filter(
      (timestamp) => now - timestamp < WS_SEND_WINDOW_MS,
    );

    if (timestamps.length >= WS_SEND_LIMIT) {
      this.sendTimestamps.set(socketId, timestamps);
      return false;
    }

    timestamps.push(now);
    this.sendTimestamps.set(socketId, timestamps);
    return true;
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;

    return typeof authToken === 'string' ? authToken : '';
  }
}
