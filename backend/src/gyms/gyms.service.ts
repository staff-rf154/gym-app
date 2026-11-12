import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Gym } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Gym[]> {
    return this.prisma.gym.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<Gym> {
    const gym = await this.prisma.gym.findUnique({ where: { id } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    return gym;
  }

  create(dto: CreateGymDto): Promise<Gym> {
    return this.prisma.gym.create({ data: dto });
  }

  async update(id: string, dto: UpdateGymDto): Promise<Gym> {
    await this.findOne(id);

    return this.prisma.gym.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const [
      equipmentCount,
      trainerGymCount,
      clientGymCount,
      clientTrainerCount,
      workoutCount,
      notificationCount,
    ] = await Promise.all([
      this.prisma.gymEquipment.count({ where: { gymId: id } }),
      this.prisma.trainerGym.count({ where: { gymId: id } }),
      this.prisma.clientGym.count({ where: { gymId: id } }),
      this.prisma.clientTrainer.count({ where: { gymId: id } }),
      this.prisma.workout.count({ where: { gymId: id } }),
      this.prisma.notification.count({ where: { gymId: id } }),
    ]);

    if (
      equipmentCount > 0 ||
      trainerGymCount > 0 ||
      clientGymCount > 0 ||
      clientTrainerCount > 0 ||
      workoutCount > 0 ||
      notificationCount > 0
    ) {
      throw new ConflictException('Gym has related records and cannot be deleted');
    }

    await this.prisma.gym.delete({ where: { id } });
  }
}
