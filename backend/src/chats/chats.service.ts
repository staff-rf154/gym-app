import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatType,
  Message,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { dateStringInTimezone } from '../common/timezone';
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
  peerRole: Role | null;
  lastMessage: string | null;
  unreadCount: number;
  isBlocked: boolean;
}

export interface ChatStaffContact {
  id: string;
  name: string;
  role: Role;
  gymId: string | null;
  gymName: string | null;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatEvents: ChatEvents,
    private readonly notificationsService: NotificationsService,
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
      items: await Promise.all(
        chats.map(async (chat) => ({
          ...this.toResponse(chat, role),
          isBlocked: await this.isChatBlocked(chat),
        })),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findStaff(userId: string, role: Role): Promise<ChatStaffContact[]> {
    let gymIds: string[] = [];

    if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      gymIds = (
        await this.prisma.trainerGym.findMany({
          where: { trainerId: trainer.id, isActive: true },
          select: { gymId: true },
        })
      ).map((link) => link.gymId);
    } else if (role === Role.CLIENT) {
      const client = await this.prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!client) {
        throw new ForbiddenException('Client profile not found');
      }

      gymIds = (
        await this.prisma.clientGym.findMany({
          where: { clientId: client.id, isActive: true },
          select: { gymId: true },
        })
      ).map((link) => link.gymId);
    } else {
      return [];
    }

    const administrators =
      gymIds.length > 0
        ? await this.prisma.administrator.findMany({
            where: { gymId: { in: gymIds } },
            select: {
              userId: true,
              user: { select: { name: true } },
              gym: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const contacts: ChatStaffContact[] = administrators.map((item) => ({
      id: item.userId,
      name: item.user.name,
      role: Role.ADMINISTRATOR,
      gymId: item.gym.id,
      gymName: item.gym.name,
    }));

    if (contacts.length === 0) {
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });

      contacts.push(
        ...admins.map((admin) => ({
          id: admin.id,
          name: admin.name,
          role: Role.ADMIN,
          gymId: null,
          gymName: null,
        })),
      );
    }

    return contacts;
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
      return {
        ...this.toResponse(existing, role),
        isBlocked: await this.isChatBlocked(existing),
      };
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

    return {
      ...this.toResponse(chat, role),
      isBlocked: await this.isChatBlocked(chat),
    };
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

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        client: { select: { userId: true } },
        trainer: { select: { userId: true } },
        adminId: true,
      },
    });

    const recipients = [
      chat?.client?.userId,
      chat?.trainer?.userId,
      chat?.adminId,
    ].filter((id): id is string => Boolean(id) && id !== userId);

    if (recipients.length > 0) {
      void this.notificationsService.createEvent({
        recipientIds: recipients,
        senderId: userId,
        type: NotificationType.MESSAGE,
        entityId: chatId,
        title: 'Новое сообщение',
        body: dto.text.length > 120 ? `${dto.text.slice(0, 120)}…` : dto.text,
      });
    }

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

    if (chat.adminId === userId) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === Role.ADMIN) {
      return true;
    }

    return (
      chat.client?.userId === userId || chat.trainer?.userId === userId
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
      select: {
        clientId: true,
        trainerId: true,
        client: {
          select: { userId: true, user: { select: { timezone: true } } },
        },
      },
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

    if (
      chat.client &&
      (await this.isLinkBlocked(
        chat.clientId,
        chat.client.user.timezone,
        chat.trainerId,
      ))
    ) {
      throw new ForbiddenException(
        'Chat is blocked: no future workout and more than 10 days since the last one',
      );
    }
  }

  private async isChatBlocked(chat: ChatEntity): Promise<boolean> {
    if (!chat.clientId || !chat.trainerId || !chat.client) {
      return false;
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
      return true;
    }

    return this.isLinkBlocked(
      chat.clientId,
      chat.client.user.timezone,
      chat.trainerId,
    );
  }

  private async isLinkBlocked(
    clientId: string,
    timezone: string,
    trainerId?: string | null,
  ): Promise<boolean> {
    const today = dateStringInTimezone(new Date(), timezone);
    const todayDate = new Date(`${today}T00:00:00.000Z`);

    const future = await this.prisma.workout.count({
      where: {
        clientId,
        ...(trainerId ? { trainerId } : {}),
        date: { gte: todayDate },
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
    });

    if (future > 0) {
      return false;
    }

    const last = await this.prisma.workout.findFirst({
      where: { clientId, ...(trainerId ? { trainerId } : {}) },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (!last) {
      return true;
    }

    const lastDate = last.date.toISOString().slice(0, 10);
    const diffDays =
      (todayDate.getTime() -
        new Date(`${lastDate}T00:00:00.000Z`).getTime()) /
      86_400_000;

    return diffDays > 10;
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
        adminId = adminId
          ? await this.resolveClientStaff(adminId, clientId)
          : await this.pickClientStaff(clientId);
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
        if (adminId) {
          await this.assertStaffForTrainer(adminId, trainer.id);
        }
        adminId = adminId ?? (await this.pickTrainerStaff(trainer.id));
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
    } else if (role === Role.ADMINISTRATOR) {
      const administrator = await this.prisma.administrator.findUnique({
        where: { userId },
        select: { gymId: true },
      });

      if (!administrator) {
        throw new ForbiddenException('Administrator profile not found');
      }

      adminId = userId;

      if (dto.type === ChatType.CLIENT_ADMIN) {
        if (!clientId) {
          throw new BadRequestException('client_id is required');
        }
        await this.assertClientInGym(clientId, administrator.gymId);
        trainerId = null;
      } else if (dto.type === ChatType.TRAINER_ADMIN) {
        if (!trainerId) {
          throw new BadRequestException('trainer_id is required');
        }
        await this.assertTrainerInGym(trainerId, administrator.gymId);
        clientId = null;
      } else {
        throw new ForbiddenException('Administrator cannot create this chat type');
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

  private async assertClientInGym(
    clientId: string,
    gymId: string,
  ): Promise<void> {
    const link = await this.prisma.clientGym.findFirst({
      where: { clientId, gymId, isActive: true },
      select: { id: true },
    });

    if (!link) {
      throw new ForbiddenException('Client is not assigned to this gym');
    }
  }

  private async assertTrainerInGym(
    trainerId: string,
    gymId: string,
  ): Promise<void> {
    const link = await this.prisma.trainerGym.findFirst({
      where: { trainerId, gymId, isActive: true },
      select: { id: true },
    });

    if (!link) {
      throw new ForbiddenException('Trainer is not assigned to this gym');
    }
  }

  private async resolveClientStaff(
    staffId: string,
    clientId: string,
  ): Promise<string> {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true, administrator: { select: { gymId: true } } },
    });

    if (staff?.role === Role.ADMIN) {
      return staffId;
    }

    if (staff?.role === Role.ADMINISTRATOR && staff.administrator) {
      await this.assertClientInGym(clientId, staff.administrator.gymId);
      return staffId;
    }

    throw new BadRequestException(
      'admin_id must reference an admin or administrator',
    );
  }

  private async pickClientStaff(clientId: string): Promise<string> {
    const clientGyms = await this.prisma.clientGym.findMany({
      where: { clientId, isActive: true },
      select: { gymId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (clientGyms.length > 0) {
      const administrator = await this.prisma.administrator.findFirst({
        where: { gymId: { in: clientGyms.map((item) => item.gymId) } },
        select: { userId: true },
        orderBy: { createdAt: 'asc' },
      });

      if (administrator) {
        return administrator.userId;
      }
    }

    return this.pickAdminId();
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

  private async pickTrainerStaff(trainerId: string): Promise<string> {
    const gymIds = (
      await this.prisma.trainerGym.findMany({
        where: { trainerId, isActive: true },
        select: { gymId: true },
        orderBy: { createdAt: 'asc' },
      })
    ).map((link) => link.gymId);

    if (gymIds.length > 0) {
      const administrator = await this.prisma.administrator.findFirst({
        where: { gymId: { in: gymIds } },
        select: { userId: true },
        orderBy: { createdAt: 'asc' },
      });

      if (administrator) {
        return administrator.userId;
      }
    }

    return this.pickAdminId();
  }

  private async assertStaffForTrainer(
    staffId: string,
    trainerId: string,
  ): Promise<void> {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true, administrator: { select: { gymId: true } } },
    });

    if (staff?.role === Role.ADMIN) {
      return;
    }

    if (staff?.role === Role.ADMINISTRATOR && staff.administrator) {
      const link = await this.prisma.trainerGym.findFirst({
        where: {
          trainerId,
          gymId: staff.administrator.gymId,
          isActive: true,
        },
        select: { id: true },
      });

      if (link) {
        return;
      }
    }

    throw new BadRequestException(
      'admin_id must reference an admin or the trainer gym administrator',
    );
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

    if (role === Role.ADMIN) {
      return {};
    }

    return { adminId: userId };
  }

  private toResponse(
    chat: ChatEntity,
    role: Role,
  ): Omit<ChatResponse, 'isBlocked'> {
    const peer = this.resolvePeer(chat, role);

    return {
      id: chat.id,
      type: chat.type,
      peerId: peer.id,
      peerName: peer.name,
      peerRole: peer.role,
      lastMessage: chat.messages[0]?.text ?? null,
      unreadCount: chat._count.messages,
    };
  }

  private resolvePeer(
    chat: ChatEntity,
    role: Role,
  ): { id: string; name: string; role: Role | null } {
    if (role === Role.CLIENT) {
      if (chat.trainer) {
        return {
          id: chat.trainer.userId,
          name: chat.trainer.user.name,
          role: chat.trainer.user.role,
        };
      }
      return {
        id: chat.adminId ?? '',
        name: chat.admin?.name ?? '',
        role: chat.admin?.role ?? null,
      };
    }

    if (role === Role.TRAINER) {
      if (chat.client) {
        return {
          id: chat.client.userId,
          name: chat.client.user.name,
          role: chat.client.user.role,
        };
      }
      return {
        id: chat.adminId ?? '',
        name: chat.admin?.name ?? '',
        role: chat.admin?.role ?? null,
      };
    }

    if (chat.client) {
      return {
        id: chat.client.userId,
        name: chat.client.user.name,
        role: chat.client.user.role,
      };
    }

    if (chat.trainer) {
      return {
        id: chat.trainer.userId,
        name: chat.trainer.user.name,
        role: chat.trainer.user.role,
      };
    }

    return { id: '', name: '', role: null };
  }
}
