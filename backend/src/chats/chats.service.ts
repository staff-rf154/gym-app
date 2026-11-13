import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatType, Message, Prisma, Role } from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChatEvents } from './chat-events.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { MessagesQueryDto, SendMessageDto } from './dto/message.dto';

const chatInclude = {
  client: { include: { user: true } },
  trainer: { include: { user: true } },
  admin: true,
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.ChatInclude;

type ChatEntity = Prisma.ChatGetPayload<{ include: typeof chatInclude }> & {
  _count: { messages: number };
};

export interface ChatResponse {
  id: string;
  type: ChatType;
  peerId: string;
  peerName: string;
  lastMessage: string | null;
  unreadCount: number;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatEvents: ChatEvents,
  ) {}

  async findChats(
    userId: string,
    role: Role,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ): Promise<PaginatedResponse<ChatResponse>> {
    const where = await this.buildParticipantWhere(userId, role);

    const [chats, total] = await this.prisma.$transaction([
      this.prisma.chat.findMany({
        where,
        include: {
          ...chatInclude,
          _count: {
            select: {
              messages: {
                where: { readAt: null, senderId: { not: userId } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.chat.count({ where }),
    ]);

    return {
      items: chats.map((chat) => this.toResponse(chat, role)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async createChat(
    userId: string,
    role: Role,
    dto: CreateChatDto,
  ): Promise<ChatResponse> {
    const participants = await this.resolveChatParticipants(userId, role, dto);
    const existing = await this.prisma.chat.findFirst({
      where: participants,
      include: {
        ...chatInclude,
        _count: {
          select: {
            messages: {
              where: { readAt: null, senderId: { not: userId } },
            },
          },
        },
      },
    });

    if (existing) {
      return this.toResponse(existing, role);
    }

    const chat = await this.prisma.chat.create({
      data: participants,
      include: {
        ...chatInclude,
        _count: {
          select: {
            messages: {
              where: { readAt: null, senderId: { not: userId } },
            },
          },
        },
      },
    });

    return this.toResponse(chat, role);
  }

  async findMessages(
    userId: string,
    chatId: string,
    query: MessagesQueryDto,
  ): Promise<Message[]> {
    await this.assertParticipant(userId, chatId);

    const limit = query.limit ?? 50;
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  async sendMessage(
    userId: string,
    chatId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    await this.assertParticipant(userId, chatId);
    await this.assertActiveLink(chatId);

    const message = await this.prisma.message.create({
      data: { chatId, senderId: userId, text: dto.text },
    });

    this.chatEvents.emitMessage(message);

    return message;
  }

  async markRead(userId: string, chatId: string): Promise<void> {
    await this.assertParticipant(userId, chatId);

    await this.prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async isParticipant(userId: string, chatId: string): Promise<boolean> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        client: { select: { userId: true } },
        trainer: { select: { userId: true } },
      },
    });

    if (!chat) {
      return false;
    }

    return (
      chat.client?.userId === userId ||
      chat.trainer?.userId === userId ||
      chat.adminId === userId
    );
  }

  private async assertParticipant(
    userId: string,
    chatId: string,
  ): Promise<void> {
    if (!(await this.isParticipant(userId, chatId))) {
      throw new NotFoundException('Chat not found');
    }
  }

  private async assertActiveLink(chatId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { clientId: true, trainerId: true },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (!chat.clientId || !chat.trainerId) {
      return;
    }

    const activeLink = await this.prisma.clientTrainer.findFirst({
      where: {
        clientId: chat.clientId,
        trainerId: chat.trainerId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!activeLink) {
      throw new ForbiddenException(
        'Chat is read-only because the client-trainer link is inactive',
      );
    }
  }

  private async resolveChatParticipants(
    userId: string,
    role: Role,
    dto: CreateChatDto,
  ): Promise<{
    type: ChatType;
    clientId: string | null;
    trainerId: string | null;
    adminId: string | null;
  }> {
    let clientId = dto.client_id ?? null;
    let trainerId = dto.trainer_id ?? null;
    let adminId = dto.admin_id ?? null;

    if (role === Role.CLIENT) {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!client) {
        throw new ForbiddenException('Client profile not found');
      }

      clientId = client.id;

      if (dto.type === ChatType.CLIENT_TRAINER) {
        if (!trainerId) {
          throw new BadRequestException('trainer_id is required');
        }
        await this.assertActiveClientTrainer(clientId, trainerId);
        adminId = null;
      } else if (dto.type === ChatType.CLIENT_ADMIN) {
        adminId = adminId ?? (await this.pickAdminId());
        trainerId = null;
      } else {
        throw new ForbiddenException('Client cannot create this chat type');
      }
    } else if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      trainerId = trainer.id;

      if (dto.type === ChatType.CLIENT_TRAINER) {
        if (!clientId) {
          throw new BadRequestException('client_id is required');
        }
        await this.assertActiveClientTrainer(clientId, trainerId);
        adminId = null;
      } else if (dto.type === ChatType.TRAINER_ADMIN) {
        adminId = adminId ?? (await this.pickAdminId());
        clientId = null;
      } else {
        throw new ForbiddenException('Trainer cannot create this chat type');
      }
    } else if (role === Role.ADMIN) {
      adminId = userId;

      if (dto.type === ChatType.CLIENT_ADMIN) {
        if (!clientId) {
          throw new BadRequestException('client_id is required');
        }
        trainerId = null;
      } else if (dto.type === ChatType.TRAINER_ADMIN) {
        if (!trainerId) {
          throw new BadRequestException('trainer_id is required');
        }
        clientId = null;
      } else if (dto.type === ChatType.CLIENT_TRAINER) {
        if (!clientId || !trainerId) {
          throw new BadRequestException(
            'client_id and trainer_id are required',
          );
        }
        await this.assertActiveClientTrainer(clientId, trainerId);
        adminId = null;
      }
    } else {
      throw new ForbiddenException('Role cannot create chats');
    }

    return { type: dto.type, clientId, trainerId, adminId };
  }

  private async assertActiveClientTrainer(
    clientId: string,
    trainerId: string,
  ): Promise<void> {
    const link = await this.prisma.clientTrainer.findFirst({
      where: { clientId, trainerId, isActive: true },
      select: { id: true },
    });

    if (!link) {
      throw new ForbiddenException(
        'Client-trainer link is not active',
      );
    }
  }

  private async pickAdminId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin.id;
  }

  private async buildParticipantWhere(
    userId: string,
    role: Role,
  ): Promise<Prisma.ChatWhereInput> {
    if (role === Role.CLIENT) {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!client) {
        throw new ForbiddenException('Client profile not found');
      }

      return { clientId: client.id };
    }

    if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      return { trainerId: trainer.id };
    }

    return { adminId: userId };
  }

  private toResponse(chat: ChatEntity, role: Role): ChatResponse {
    const peer = this.resolvePeer(chat, role);

    return {
      id: chat.id,
      type: chat.type,
      peerId: peer.id,
      peerName: peer.name,
      lastMessage: chat.messages[0]?.text ?? null,
      unreadCount: chat._count.messages,
    };
  }

  private resolvePeer(
    chat: ChatEntity,
    role: Role,
  ): { id: string; name: string } {
    if (role === Role.CLIENT) {
      if (chat.trainer) {
        return { id: chat.trainer.userId, name: chat.trainer.user.name };
      }
      return { id: chat.adminId ?? '', name: chat.admin?.name ?? '' };
    }

    if (role === Role.TRAINER) {
      if (chat.client) {
        return { id: chat.client.userId, name: chat.client.user.name };
      }
      return { id: chat.adminId ?? '', name: chat.admin?.name ?? '' };
    }

    if (chat.client) {
      return { id: chat.client.userId, name: chat.client.user.name };
    }

    if (chat.trainer) {
      return { id: chat.trainer.userId, name: chat.trainer.user.name };
    }

    return { id: '', name: '' };
  }
}
