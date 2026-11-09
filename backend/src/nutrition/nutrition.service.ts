import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NutritionRecommendation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientNutritionQueryDto } from './dto/client-nutrition-query.dto';
import { CreateNutritionDto } from './dto/create-nutrition.dto';

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.nutritionRecommendation.create({
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
  }

  async findClientNutrition(
    userId: string,
    query: ClientNutritionQueryDto,
  ): Promise<NutritionRecommendation[]> {
    const client = await this.prisma.client.findUnique({ where: { userId } });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    const date = parseDate(
      query.date ?? new Date().toISOString().slice(0, 10),
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
