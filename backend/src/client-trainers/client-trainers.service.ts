import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientTrainer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LinkTrainerDto } from './dto/link-trainer.dto';

@Injectable()
export class ClientTrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async link(
    clientId: string,
    dto: LinkTrainerDto,
    assignedById?: string,
  ): Promise<ClientTrainer> {
    const [client, trainer, gym] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: clientId } }),
      this.prisma.trainer.findUnique({ where: { id: dto.trainer_id } }),
      this.prisma.gym.findUnique({ where: { id: dto.gym_id } }),
    ]);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    await this.prisma.$transaction([
      this.prisma.trainerGym.upsert({
        where: {
          trainerId_gymId: { trainerId: dto.trainer_id, gymId: dto.gym_id },
        },
        create: { trainerId: dto.trainer_id, gymId: dto.gym_id },
        update: { isActive: true },
      }),
      this.prisma.clientGym.upsert({
        where: {
          clientId_gymId: { clientId, gymId: dto.gym_id },
        },
        create: { clientId, gymId: dto.gym_id },
        update: { isActive: true },
      }),
    ]);

    const existing = await this.prisma.clientTrainer.findUnique({
      where: {
        clientId_trainerId_gymId: {
          clientId,
          trainerId: dto.trainer_id,
          gymId: dto.gym_id,
        },
      },
    });

    if (existing?.isActive) {
      throw new ConflictException('Link already exists');
    }

    if (existing) {
      return this.prisma.clientTrainer.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          assignedBy: 'ADMIN',
          assignedById: assignedById ?? null,
          assignedAt: new Date(),
        },
      });
    }

    return this.prisma.clientTrainer.create({
      data: {
        clientId,
        trainerId: dto.trainer_id,
        gymId: dto.gym_id,
        assignedBy: 'ADMIN',
        assignedById: assignedById ?? null,
      },
    });
  }

  async unlink(clientId: string, linkId: string): Promise<void> {
    const link = await this.prisma.clientTrainer.findFirst({
      where: { id: linkId, clientId, isActive: true },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.clientTrainer.update({
      where: { id: linkId },
      data: { isActive: false },
    });
  }
}
