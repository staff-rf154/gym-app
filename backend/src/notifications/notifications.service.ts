import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType, Role } from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PushService } from './push.service';
import { SyncQueueService } from '../queue/sync-queue.service';

export interface NotificationResponse {
  id: string;
  gymId: string | null;
  type: NotificationType;
  entityId: string | null;
  title: string;
  body: string;
  senderId: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationEventInput {
  recipientIds: string[];
  senderId: string;
  type: NotificationType;
  entityId?: string | null;
  title: string;
  body: string;
  gymId?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly syncQueue: SyncQueueService,
  ) {
    this.syncQueue.register('notifications.persist', (payload) =>
      this.persist(payload as NotificationEventInput),
    );
  }

  async create(
    senderId: string,
    dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    const gymId: string | null = dto.gym_id ?? null;

    if (gymId) {
      const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

      if (!gym) {
        throw new NotFoundException('Gym not found');
      }
    }

    const rawRecipients = gymId
      ? (
          await this.prisma.clientTrainer.findMany({
            where: { gymId, isActive: true },
            select: { client: { select: { userId: true } } },
          })
        ).map((link) => link.client.userId)
      : (
          await this.prisma.user.findMany({
            where: { role: Role.CLIENT },
            select: { id: true },
          })
        ).map((user) => user.id);

    return this.syncQueue.run(
      'notifications.persist',
      {
        recipientIds: rawRecipients,
        senderId,
        type: NotificationType.SYSTEM,
        title: dto.title,
        body: dto.body,
        gymId,
      },
    ) as Promise<NotificationResponse>;
  }

  async createEvent(
    input: NotificationEventInput,
  ): Promise<NotificationResponse | null> {
    try {
      return await this.persist(input);
    } catch (error) {
      this.logger.error(
        `Failed to persist notification event ${input.type}`,
        error,
      );
      return null;
    }
  }

  private async persist(
    input: NotificationEventInput,
  ): Promise<NotificationResponse> {
    const recipientIds = [...new Set(input.recipientIds)].filter(Boolean);

    const notification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.notification.create({
        data: {
          gymId: input.gymId ?? null,
          type: input.type,
          entityId: input.entityId ?? null,
          title: input.title,
          body: input.body,
          senderId: input.senderId,
        },
      });

      for (let index = 0; index < recipientIds.length; index += 500) {
        const chunk = recipientIds.slice(index, index + 500);
        await tx.notificationRecipient.createMany({
          data: chunk.map((userId) => ({
            notificationId: created.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    if (recipientIds.length > 0) {
      const pushRecipients = await this.prisma.user.findMany({
        where: { id: { in: recipientIds }, pushToken: { not: null } },
        select: { id: true },
      });

      if (pushRecipients.length > 0) {
        void this.pushService.sendToUsers(
          pushRecipients.map((user) => user.id),
          input.title,
          input.body,
          {
            type: input.type,
            ...(input.entityId ? { entityId: input.entityId } : {}),
          },
        );
      }
    }

    return this.toResponse(notification, null);
  }

  async findForUser(
    userId: string,
    query: PaginationQueryDto = new PaginationQueryDto(),
  ): Promise<PaginatedResponse<NotificationResponse>> {
    const where = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notificationRecipient.findMany({
        where,
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.notificationRecipient.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toResponse(row.notification, row.readAt)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: { userId, notificationId },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  private toResponse(
    notification: Notification,
    readAt: Date | null,
  ): NotificationResponse {
    return {
      id: notification.id,
      gymId: notification.gymId,
      type: notification.type,
      entityId: notification.entityId,
      title: notification.title,
      body: notification.body,
      senderId: notification.senderId,
      createdAt: notification.createdAt,
      readAt,
    };
  }
}
