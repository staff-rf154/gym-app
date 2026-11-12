import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WeightMeasurement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeightMeasurementDto } from './dto/create-weight-measurement.dto';

@Injectable()
export class WeightMeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    clientId: string,
  ): Promise<WeightMeasurement[]> {
    await this.ensureTrainerLinkedToClient(userId, clientId);

    return this.prisma.weightMeasurement.findMany({
      where: { clientId },
      orderBy: { measuredAt: 'desc' },
    });
  }

  async create(
    userId: string,
    clientId: string,
    dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    await this.ensureTrainerLinkedToClient(userId, clientId);

    return this.createMeasurement(userId, clientId, dto);
  }

  async findAllForAdmin(clientId: string): Promise<WeightMeasurement[]> {
    await this.ensureClient(clientId);

    return this.prisma.weightMeasurement.findMany({
      where: { clientId },
      orderBy: { measuredAt: 'desc' },
    });
  }

  async createForAdmin(
    userId: string,
    clientId: string,
    dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    await this.ensureClient(clientId);

    return this.createMeasurement(userId, clientId, dto);
  }

  private createMeasurement(
    userId: string,
    clientId: string,
    dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    return this.prisma.weightMeasurement.create({
      data: {
        clientId,
        measuredBy: userId,
        measuredAt: new Date(dto.measuredAt),
        weight: dto.weight,
        fatMass: dto.fatMass,
        comment: dto.comment,
      },
    });
  }

  private async ensureClient(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private async ensureTrainerLinkedToClient(
    userId: string,
    clientId: string,
  ): Promise<void> {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer not linked to client');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const link = await this.prisma.clientTrainer.findFirst({
      where: {
        clientId,
        trainerId: trainer.id,
        isActive: true,
      },
    });

    if (!link) {
      throw new ForbiddenException('Trainer not linked to client');
    }
  }
}
