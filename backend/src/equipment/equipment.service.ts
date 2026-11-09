import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GymEquipment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByGym(gymId: string): Promise<GymEquipment[]> {
    await this.ensureGym(gymId);

    return this.prisma.gymEquipment.findMany({
      where: { gymId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<GymEquipment> {
    const equipment = await this.prisma.gymEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    return equipment;
  }

  async create(
    gymId: string,
    dto: CreateEquipmentDto,
  ): Promise<GymEquipment> {
    await this.ensureGym(gymId);
    this.validateWeights(dto.minWeight, dto.maxWeight);

    return this.prisma.gymEquipment.create({
      data: { ...dto, gymId },
    });
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<GymEquipment> {
    const equipment = await this.findOne(id);

    const minWeight =
      dto.minWeight !== undefined ? dto.minWeight : equipment.minWeight;
    const maxWeight =
      dto.maxWeight !== undefined ? dto.maxWeight : equipment.maxWeight;
    this.validateWeights(minWeight, maxWeight);

    return this.prisma.gymEquipment.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.gymEquipment.delete({ where: { id } });
  }

  private async ensureGym(gymId: string): Promise<void> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
  }

  private validateWeights(
    minWeight?: number | null,
    maxWeight?: number | null,
  ): void {
    if (
      minWeight !== null &&
      minWeight !== undefined &&
      maxWeight !== null &&
      maxWeight !== undefined &&
      minWeight > maxWeight
    ) {
      throw new BadRequestException(
        'minWeight must be less than or equal to maxWeight',
      );
    }
  }
}
