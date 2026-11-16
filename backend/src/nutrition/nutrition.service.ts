import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  NutritionRecommendation,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ClientNutritionQueryDto } from './dto/client-nutrition-query.dto';
import { CreateNutritionDto } from './dto/create-nutrition.dto';
import { TrainerNutritionQueryDto } from './dto/trainer-nutrition-query.dto';

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
    new Date(),
  );
}

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    dto: CreateNutritionDto,
  ): Promise<NutritionRecommendation> {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: dto.client_id },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const link = await this.prisma.clientTrainer.findFirst({
      where: { clientId: dto.client_id, trainerId: trainer.id, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Trainer not linked to client');
    }

    const validFrom = dto.validFrom ? parseDate(dto.validFrom) : undefined;
    const validTo = dto.validTo ? parseDate(dto.validTo) : undefined;

    if (validFrom && validTo && validFrom.getTime() > validTo.getTime()) {
      throw new BadRequestException('validFrom must be less than or equal to validTo');
    }

    const created = await this.prisma.nutritionRecommendation.create({
      data: {
        clientId: dto.client_id,
        trainerId: trainer.id,
        type: dto.type,
        kcal: dto.kcal,
        protein: dto.protein,
        fat: dto.fat,
        carbs: dto.carbs,
        comment: dto.comment,
        validFrom,
        validTo,
      },
    });

    void this.notificationsService.createEvent({
      recipientIds: [client.userId],
      senderId: trainer.userId,
      type: NotificationType.NUTRITION,
      entityId: created.id,
      title: 'Назначено питание',
      body: 'Тренер назначил новую рекомендацию по питанию.',
    });

    return created;
  }

  async archive(userId: string, id: string): Promise<NutritionRecommendation> {
    return this.setArchived(userId, id, true);
  }

  async cancel(userId: string, id: string): Promise<NutritionRecommendation> {
    return this.setArchived(userId, id, true);
  }

  private async setArchived(
    userId: string,
    id: string,
    archived: boolean,
  ): Promise<NutritionRecommendation> {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    const recommendation = await this.prisma.nutritionRecommendation.findUnique({
      where: { id },
    });

    if (!recommendation || recommendation.trainerId !== trainer.id) {
      throw new NotFoundException('Nutrition recommendation not found');
    }

    return this.prisma.nutritionRecommendation.update({
      where: { id },
      data: {
        isActive: !archived,
        archivedAt: archived ? new Date() : null,
      },
    });
  }

  async findTrainerNutrition(
    userId: string,
    query: TrainerNutritionQueryDto,
  ): Promise<NutritionRecommendation[]> {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    const link = await this.prisma.clientTrainer.findFirst({
      where: {
        clientId: query.client_id,
        trainerId: trainer.id,
        isActive: true,
      },
    });

    if (!link) {
      throw new ForbiddenException('Trainer not linked to client');
    }

    return this.prisma.nutritionRecommendation.findMany({
      where: { clientId: query.client_id, trainerId: trainer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findClientNutrition(
    userId: string,
    query: ClientNutritionQueryDto,
  ): Promise<NutritionRecommendation[]> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: { user: { select: { timezone: true } } },
    });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    const date = parseDate(
      query.date ?? todayInTimezone(client.user.timezone),
    );

    const where: Prisma.NutritionRecommendationWhereInput = {
      clientId: client.id,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: date } }] },
        { OR: [{ validTo: null }, { validTo: { gte: date } }] },
      ],
    };

    return this.prisma.nutritionRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
