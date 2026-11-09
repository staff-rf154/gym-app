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

  async link(clientId: string, dto: LinkTrainerDto): Promise<ClientTrainer> {
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

    const existing = await this.prisma.clientTrainer.findFirst({
      where: {
        clientId,
        trainerId: dto.trainer_id,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException('Link already exists');
    }

    return this.prisma.clientTrainer.create({
      data: {
        clientId,
        trainerId: dto.trainer_id,
        gymId: dto.gym_id,
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
