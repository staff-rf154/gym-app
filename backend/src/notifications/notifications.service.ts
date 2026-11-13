import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Role } from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PushService } from './push.service';

export interface NotificationResponse {
  id: string;
  gymId: string | null;
  title: string;
  body: string;
  senderId: string;
  createdAt: Date;
  readAt: Date | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

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
            select: {
              client: {
                select: {
                  userId: true,
                  user: { select: { pushToken: true } },
                },
              },
            },
          })
        ).map((link) => ({
          id: link.client.userId,
          pushToken: link.client.user.pushToken,
        }))
      : await this.prisma.user.findMany({
          where: { role: Role.CLIENT },
          select: { id: true, pushToken: true },
        });

    const recipients = [
      ...new Map(
        rawRecipients.map((recipient) => [recipient.id, recipient]),
      ).values(),
    ];

    const notification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.notification.create({
        data: { gymId, title: dto.title, body: dto.body, senderId },
      });

      if (recipients.length > 0) {
        await tx.notificationRecipient.createMany({
          data: recipients.map((recipient) => ({
            notificationId: created.id,
            userId: recipient.id,
          })),
        });
      }

      return created;
    });

    const pushUserIds = recipients
      .filter((recipient) => Boolean(recipient.pushToken))
      .map((recipient) => recipient.id);

    if (pushUserIds.length > 0) {
      void this.pushService.sendToUsers(pushUserIds, dto.title, dto.body);
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
      title: notification.title,
      body: notification.body,
      senderId: notification.senderId,
      createdAt: notification.createdAt,
      readAt,
    };
  }
}
