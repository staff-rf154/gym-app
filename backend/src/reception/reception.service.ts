import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientResponse,
  ClientsService,
  CreateClientResponse,
} from '../clients/clients.service';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWeightMeasurementDto } from '../weight-measurements/dto/create-weight-measurement.dto';
import { WeightMeasurementsService } from '../weight-measurements/weight-measurements.service';
import { CreateTrainerDto } from '../trainers/dto/create-trainer.dto';
import { UpdateTrainerDto } from '../trainers/dto/update-trainer.dto';
import {
  CreateTrainerResponse,
  TrainerResponse,
  TrainersService,
} from '../trainers/trainers.service';

export interface ReceptionGymResponse {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface ReceptionClientTrainerResponse {
  id: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  isActive: boolean;
  assignedBy: string;
  assignedById: string | null;
  assignedAt: Date;
}

interface ReceptionContext {
  receptionId: string;
  gymId: string;
  gymName: string;
}

@Injectable()
export class ReceptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly trainersService: TrainersService,
    private readonly weightMeasurementsService: WeightMeasurementsService,
  ) {}

  async getGym(userId: string): Promise<ReceptionGymResponse> {
    const context = await this.getContext(userId);
    const gym = await this.getGymEntity(context.gymId);

    return {
      id: context.gymId,
      name: context.gymName,
      address: gym.address,
      isActive: gym.isActive,
    };
  }

  async findClients(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ClientResponse>> {
    const context = await this.getContext(userId);

    return this.clientsService.findAll(context.gymId, query);
  }

  async findClient(
    userId: string,
    clientId: string,
  ): Promise<ClientResponse> {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    return this.clientsService.findOne(clientId, context.gymId);
  }

  async findWeightMeasurements(
    userId: string,
    clientId: string,
  ) {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    return this.weightMeasurementsService.findAllForReception(
      clientId,
      context.gymId,
    );
  }

  async createWeightMeasurement(
    userId: string,
    clientId: string,
    dto: CreateWeightMeasurementDto,
  ) {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    return this.weightMeasurementsService.createForReception(
      userId,
      clientId,
      context.gymId,
      dto,
    );
  }

  async createClient(
    userId: string,
    dto: CreateClientDto,
  ): Promise<CreateClientResponse> {
    const context = await this.getContext(userId);

    return this.clientsService.create(dto, { gymId: context.gymId });
  }

  async updateClient(
    userId: string,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<ClientResponse> {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    return this.clientsService.update(clientId, dto);
  }

  async setClientPhoto(
    userId: string,
    clientId: string,
    photoUrl: string,
  ): Promise<ClientResponse> {
    return this.updateClient(userId, clientId, { photoUrl });
  }

  async resetClientPassword(
    userId: string,
    clientId: string,
    password?: string,
  ): Promise<{ new_password: string }> {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    return this.clientsService.resetPassword(clientId, password);
  }

  async findTrainers(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<TrainerResponse>> {
    const context = await this.getContext(userId);

    return this.trainersService.findAll(context.gymId, query);
  }

  async createTrainer(
    userId: string,
    dto: CreateTrainerDto,
  ): Promise<CreateTrainerResponse> {
    const context = await this.getContext(userId);

    return this.trainersService.create(dto, { gymId: context.gymId });
  }

  async updateTrainer(
    userId: string,
    trainerId: string,
    dto: UpdateTrainerDto,
  ): Promise<TrainerResponse> {
    const context = await this.getContext(userId);
    await this.assertTrainerInGym(trainerId, context.gymId);

    return this.trainersService.update(trainerId, dto);
  }

  async setTrainerPhoto(
    userId: string,
    trainerId: string,
    photoUrl: string,
  ): Promise<TrainerResponse> {
    return this.updateTrainer(userId, trainerId, { photoUrl });
  }

  async resetTrainerPassword(
    userId: string,
    trainerId: string,
    password?: string,
  ): Promise<{ new_password: string }> {
    const context = await this.getContext(userId);
    await this.assertTrainerInGym(trainerId, context.gymId);

    return this.trainersService.resetPassword(trainerId, password);
  }

  async findClientTrainers(
    userId: string,
    clientId: string,
  ): Promise<ReceptionClientTrainerResponse[]> {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);

    const links = await this.prisma.clientTrainer.findMany({
      where: { clientId, gymId: context.gymId, isActive: true },
      include: {
        trainer: { include: { user: true } },
        gym: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return links.map((link) => ({
      id: link.id,
      trainerId: link.trainerId,
      trainerName: link.trainer.user.name,
      gymId: link.gymId,
      gymName: link.gym.name,
      isActive: link.isActive,
      assignedBy: link.assignedBy,
      assignedById: link.assignedById,
      assignedAt: link.assignedAt,
    }));
  }

  async linkTrainer(
    userId: string,
    clientId: string,
    trainerId: string,
  ): Promise<ReceptionClientTrainerResponse> {
    const context = await this.getContext(userId);
    await this.assertClientInGym(clientId, context.gymId);
    await this.assertTrainerInGym(trainerId, context.gymId);

    const existing = await this.prisma.clientTrainer.findUnique({
      where: {
        clientId_trainerId_gymId: {
          clientId,
          trainerId,
          gymId: context.gymId,
        },
      },
      include: { trainer: { include: { user: true } }, gym: true },
    });

    if (existing?.isActive) {
      throw new ConflictException('Trainer is already linked');
    }

    const link = existing
      ? await this.prisma.clientTrainer.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            assignedBy: 'RECEPTION',
            assignedById: userId,
            assignedAt: new Date(),
          },
          include: { trainer: { include: { user: true } }, gym: true },
        })
      : await this.prisma.clientTrainer.create({
          data: {
            clientId,
            trainerId,
            gymId: context.gymId,
            assignedBy: 'RECEPTION',
            assignedById: userId,
          },
          include: { trainer: { include: { user: true } }, gym: true },
        });

    return {
      id: link.id,
      trainerId: link.trainerId,
      trainerName: link.trainer.user.name,
      gymId: link.gymId,
      gymName: link.gym.name,
      isActive: link.isActive,
      assignedBy: link.assignedBy,
      assignedById: link.assignedById,
      assignedAt: link.assignedAt,
    };
  }

  async unlinkTrainer(
    userId: string,
    clientId: string,
    linkId: string,
  ): Promise<void> {
    const context = await this.getContext(userId);

    const result = await this.prisma.clientTrainer.updateMany({
      where: {
        id: linkId,
        clientId,
        gymId: context.gymId,
        isActive: true,
      },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Link not found');
    }
  }

  private async getContext(userId: string): Promise<ReceptionContext> {
    const reception = await this.prisma.reception.findUnique({
      where: { userId },
      include: { gym: true },
    });

    if (!reception) {
      throw new ForbiddenException('Reception profile not found');
    }

    return {
      receptionId: reception.id,
      gymId: reception.gymId,
      gymName: reception.gym.name,
    };
  }

  private async getGymEntity(gymId: string) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }

    return gym;
  }

  private async assertClientInGym(
    clientId: string,
    gymId: string,
  ): Promise<void> {
    const link = await this.prisma.clientGym.findFirst({
      where: { clientId, gymId, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Client is not active in your gym');
    }
  }

  private async assertTrainerInGym(
    trainerId: string,
    gymId: string,
  ): Promise<void> {
    const link = await this.prisma.trainerGym.findFirst({
      where: { trainerId, gymId, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Trainer is not active in your gym');
    }
  }
}
