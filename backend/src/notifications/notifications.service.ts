import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, Role } from '@prisma/client';
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

    const notification = await this.prisma.notification.create({
      data: { gymId, title: dto.title, body: dto.body, senderId },
    });

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

    if (recipients.length > 0) {
      await this.prisma.notificationRecipient.createMany({
        data: recipients.map((recipient) => ({
          notificationId: notification.id,
          userId: recipient.id,
        })),
      });
    }

    const pushUserIds = recipients
      .filter((recipient) => Boolean(recipient.pushToken))
      .map((recipient) => recipient.id);

    if (pushUserIds.length > 0) {
      void this.pushService.sendToUsers(pushUserIds, dto.title, dto.body);
    }

    return this.toResponse(notification, null);
  }

  async findForUser(userId: string): Promise<NotificationResponse[]> {
    const rows = await this.prisma.notificationRecipient.findMany({
      where: { userId },
      include: { notification: true },
      orderBy: { notification: { createdAt: 'desc' } },
    });

    return rows.map((row) =>
      this.toResponse(row.notification, row.readAt),
    );
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
