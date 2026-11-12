import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LinkGymDto } from './dto/link-gym.dto';

const gymLinkInclude = {
  gym: true,
} satisfies Prisma.TrainerGymInclude;

const clientGymInclude = {
  gym: true,
} satisfies Prisma.ClientGymInclude;

const clientTrainerInclude = {
  trainer: { include: { user: true } },
  gym: true,
} satisfies Prisma.ClientTrainerInclude;

type TrainerGymEntity = Prisma.TrainerGymGetPayload<{
  include: typeof gymLinkInclude;
}>;
type ClientGymEntity = Prisma.ClientGymGetPayload<{
  include: typeof clientGymInclude;
}>;
type ClientTrainerEntity = Prisma.ClientTrainerGetPayload<{
  include: typeof clientTrainerInclude;
}>;

export interface GymLinkResponse {
  id: string;
  gymId: string;
  gymName: string;
  gymAddress: string;
  isActive: boolean;
  createdAt: Date;
}

export interface GymTrainerResponse {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  isLinked: boolean;
}

export interface ClientTrainerLinkResponse {
  id: string;
  trainerId: string;
  trainerName: string;
  trainerPhotoUrl: string | null;
  gymId: string;
  gymName: string;
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}

@Injectable()
export class GymLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async findTrainerGyms(userId: string): Promise<GymLinkResponse[]> {
    const trainer = await this.getTrainer(userId);

    const links = await this.prisma.trainerGym.findMany({
      where: { trainerId: trainer.id, isActive: true, gym: { isActive: true } },
      include: gymLinkInclude,
      orderBy: { createdAt: 'asc' },
    });

    return links.map((link) => this.toTrainerGymResponse(link));
  }

  async findClientGyms(userId: string): Promise<GymLinkResponse[]> {
    const client = await this.getClient(userId);

    const links = await this.prisma.clientGym.findMany({
      where: { clientId: client.id, isActive: true, gym: { isActive: true } },
      include: clientGymInclude,
      orderBy: { createdAt: 'asc' },
    });

    return links.map((link) => this.toClientGymResponse(link));
  }

  async findGymTrainers(
    userId: string,
    gymId: string,
  ): Promise<GymTrainerResponse[]> {
    const client = await this.getClient(userId);
    await this.assertClientGym(client.id, gymId);

    const trainers = await this.prisma.trainer.findMany({
      where: {
        trainerGyms: { some: { gymId, isActive: true } },
        user: { role: 'TRAINER' },
      },
      include: {
        user: true,
        clientTrainers: {
          where: { clientId: client.id, gymId, isActive: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return trainers.map((trainer) => ({
      id: trainer.id,
      userId: trainer.userId,
      name: trainer.user.name,
      photoUrl: trainer.photoUrl,
      isLinked: trainer.clientTrainers.length > 0,
    }));
  }

  async findClientTrainers(userId: string): Promise<ClientTrainerLinkResponse[]> {
    const client = await this.getClient(userId);

    const links = await this.prisma.clientTrainer.findMany({
      where: { clientId: client.id, isActive: true },
      include: clientTrainerInclude,
      orderBy: { assignedAt: 'desc' },
    });

    return links.map((link) => this.toClientTrainerResponse(link));
  }

  async linkClientTrainer(
    userId: string,
    gymId: string,
    trainerId: string,
  ): Promise<ClientTrainerLinkResponse> {
    const client = await this.getClient(userId);
    await this.assertClientGym(client.id, gymId);

    const trainer = await this.prisma.trainer.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    const trainerGym = await this.prisma.trainerGym.findFirst({
      where: { trainerId, gymId, isActive: true },
    });

    if (!trainerGym) {
      throw new ForbiddenException('Trainer is not active in this gym');
    }

    const existing = await this.prisma.clientTrainer.findUnique({
      where: {
        clientId_trainerId_gymId: {
          clientId: client.id,
          trainerId,
          gymId,
        },
      },
    });

    if (existing?.isActive) {
      throw new ConflictException('Trainer is already linked');
    }

    const link = existing
      ? await this.prisma.clientTrainer.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            assignedBy: 'CLIENT',
            assignedById: userId,
            assignedAt: new Date(),
          },
          include: clientTrainerInclude,
        })
      : await this.prisma.clientTrainer.create({
          data: {
            clientId: client.id,
            trainerId,
            gymId,
            assignedBy: 'CLIENT',
            assignedById: userId,
          },
          include: clientTrainerInclude,
        });

    return this.toClientTrainerResponse(link);
  }

  async unlinkClientTrainer(userId: string, linkId: string): Promise<void> {
    const client = await this.getClient(userId);

    const result = await this.prisma.clientTrainer.updateMany({
      where: { id: linkId, clientId: client.id, isActive: true },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Link not found');
    }
  }

  async adminFindTrainerGyms(trainerId: string): Promise<GymLinkResponse[]> {
    await this.assertTrainerExists(trainerId);

    const links = await this.prisma.trainerGym.findMany({
      where: { trainerId },
      include: gymLinkInclude,
      orderBy: { createdAt: 'asc' },
    });

    return links.map((link) => this.toTrainerGymResponse(link));
  }

  async adminLinkTrainerGym(
    trainerId: string,
    dto: LinkGymDto,
  ): Promise<GymLinkResponse> {
    await this.assertTrainerExists(trainerId);
    await this.assertGymExists(dto.gym_id);

    const link = await this.prisma.trainerGym.upsert({
      where: {
        trainerId_gymId: { trainerId, gymId: dto.gym_id },
      },
      create: { trainerId, gymId: dto.gym_id },
      update: { isActive: true },
      include: gymLinkInclude,
    });

    return this.toTrainerGymResponse(link);
  }

  async adminUnlinkTrainerGym(trainerId: string, gymId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.trainerGym.updateMany({
        where: { trainerId, gymId, isActive: true },
        data: { isActive: false },
      });

      if (result.count === 0) {
        throw new NotFoundException('Link not found');
      }

      await tx.clientTrainer.updateMany({
        where: { trainerId, gymId, isActive: true },
        data: { isActive: false },
      });
    });
  }

  async adminFindClientGyms(clientId: string): Promise<GymLinkResponse[]> {
    await this.assertClientExists(clientId);

    const links = await this.prisma.clientGym.findMany({
      where: { clientId },
      include: clientGymInclude,
      orderBy: { createdAt: 'asc' },
    });

    return links.map((link) => this.toClientGymResponse(link));
  }

  async adminLinkClientGym(
    clientId: string,
    dto: LinkGymDto,
  ): Promise<GymLinkResponse> {
    await this.assertClientExists(clientId);
    await this.assertGymExists(dto.gym_id);

    const link = await this.prisma.clientGym.upsert({
      where: {
        clientId_gymId: { clientId, gymId: dto.gym_id },
      },
      create: { clientId, gymId: dto.gym_id },
      update: { isActive: true },
      include: clientGymInclude,
    });

    return this.toClientGymResponse(link);
  }

  async adminUnlinkClientGym(clientId: string, gymId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.clientGym.updateMany({
        where: { clientId, gymId, isActive: true },
        data: { isActive: false },
      });

      if (result.count === 0) {
        throw new NotFoundException('Link not found');
      }

      await tx.clientTrainer.updateMany({
        where: { clientId, gymId, isActive: true },
        data: { isActive: false },
      });
    });
  }

  private async getTrainer(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    return trainer;
  }

  private async getClient(userId: string) {
    const client = await this.prisma.client.findUnique({ where: { userId } });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    return client;
  }

  private async assertClientGym(clientId: string, gymId: string): Promise<void> {
    await this.assertGymExists(gymId);

    const link = await this.prisma.clientGym.findFirst({
      where: { clientId, gymId, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Client is not active in this gym');
    }
  }

  private async assertGymExists(gymId: string): Promise<void> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
  }

  private async assertTrainerExists(trainerId: string): Promise<void> {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
  }

  private async assertClientExists(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private toTrainerGymResponse(link: TrainerGymEntity): GymLinkResponse {
    return {
      id: link.id,
      gymId: link.gymId,
      gymName: link.gym.name,
      gymAddress: link.gym.address,
      isActive: link.isActive,
      createdAt: link.createdAt,
    };
  }

  private toClientGymResponse(link: ClientGymEntity): GymLinkResponse {
    return {
      id: link.id,
      gymId: link.gymId,
      gymName: link.gym.name,
      gymAddress: link.gym.address,
      isActive: link.isActive,
      createdAt: link.createdAt,
    };
  }

  private toClientTrainerResponse(
    link: ClientTrainerEntity,
  ): ClientTrainerLinkResponse {
    return {
      id: link.id,
      trainerId: link.trainerId,
      trainerName: link.trainer.user.name,
      trainerPhotoUrl: link.trainer.photoUrl,
      gymId: link.gymId,
      gymName: link.gym.name,
      assignedBy: link.assignedBy,
      assignedAt: link.assignedAt,
      isActive: link.isActive,
    };
  }
}
