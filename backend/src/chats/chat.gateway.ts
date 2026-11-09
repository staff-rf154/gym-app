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
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { ChatEvents } from './chat-events.service';
import { ChatsService } from './chats.service';

interface JwtPayload {
  sub: string;
  role: Role;
}

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private subscription?: Subscription;

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
      });

      client.data.userId = payload.sub;
      client.data.role = payload.role;
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(): void {
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

    if (!userId || !body?.chatId || !body.text?.trim()) {
      return { ok: false };
    }

    try {
      const message = await this.chatsService.sendMessage(userId, body.chatId, {
        text: body.text,
      });

      return { ok: true, message };
    } catch {
      return { ok: false };
    }
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const queryToken = client.handshake.query?.token;

    if (typeof authToken === 'string') {
      return authToken;
    }

    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return '';
  }
}
