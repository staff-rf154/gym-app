import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

const BCRYPT_ROUNDS = 12;

const trainerInclude = {
  user: { select: { phone: true, name: true } },
  trainerGyms: {
    where: { isActive: true },
    include: { gym: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.TrainerInclude;

type TrainerWithUser = Prisma.TrainerGetPayload<{
  include: typeof trainerInclude;
}>;

export interface TrainerGymResponse {
  id: string;
  gymId: string;
  gymName: string;
  gymAddress: string;
  isActive: boolean;
}

export interface TrainerResponse {
  id: string;
  userId: string;
  phone: string;
  name: string;
  photoUrl: string | null;
  isActive: boolean;
  archivedAt: Date | null;
  gyms: TrainerGymResponse[];
}

export interface CreateTrainerResponse extends TrainerResponse {
  initial_password: string;
}

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(
    gymId?: string,
    query: PaginationQueryDto & { include_archived?: boolean } = new PaginationQueryDto(),
  ): Promise<PaginatedResponse<TrainerResponse>> {
    const where: Prisma.TrainerWhereInput = {
      ...(gymId
        ? { trainerGyms: { some: { gymId, isActive: true } } }
        : {}),
      ...(query.include_archived ? {} : { isActive: true }),
    };

    const [trainers, total] = await this.prisma.$transaction([
      this.prisma.trainer.findMany({
        where,
        include: trainerInclude,
        orderBy: { createdAt: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.trainer.count({ where }),
    ]);

    return {
      items: trainers.map((trainer) => this.toResponse(trainer, gymId)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(
    dto: CreateTrainerDto,
    options?: { gymId?: string },
  ): Promise<CreateTrainerResponse> {
    await this.ensurePhoneAvailable(dto.phone);

    const initialPassword = this.getInitialPassword();
    const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);

    try {
      const trainer = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            passwordHash,
            role: Role.TRAINER,
            name: dto.name,
          },
        });

        const trainer = await tx.trainer.create({
          data: { userId: user.id, photoUrl: dto.photoUrl },
        });

        if (options?.gymId) {
          await tx.trainerGym.create({
            data: { trainerId: trainer.id, gymId: options.gymId },
          });
        }

        return trainer;
      });

      const created = await this.findEntity(trainer.id);

      return {
        ...this.toResponse(created),
        initial_password: initialPassword,
      };
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateTrainerDto): Promise<TrainerResponse> {
    const trainer = await this.findEntity(id);
    const phone = dto.phone ?? trainer.user.phone;

    if (phone !== trainer.user.phone) {
      await this.ensurePhoneAvailable(phone);
    }

    try {
      await this.prisma.user.update({
        where: { id: trainer.userId },
        data: {
          phone: dto.phone,
          name: dto.name,
        },
      });
      if (dto.photoUrl !== undefined) {
        await this.prisma.trainer.update({
          where: { id },
          data: { photoUrl: dto.photoUrl },
        });
      }
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }

    const updated = await this.findEntity(id);

    return this.toResponse(updated);
  }

  async resetPassword(
    id: string,
    password?: string,
  ): Promise<{ new_password: string }> {
    const trainer = await this.findEntity(id);
    const newPassword = password ?? this.getInitialPassword();
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: trainer.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: trainer.userId },
      }),
    ]);

    return { new_password: newPassword };
  }

  async remove(id: string): Promise<void> {
    const trainer = await this.findEntity(id);

    if (!trainer.isActive) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.trainer.update({
        where: { id },
        data: { isActive: false, archivedAt: new Date() },
      }),
      this.prisma.clientTrainer.updateMany({
        where: { trainerId: id, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.trainerGym.updateMany({
        where: { trainerId: id, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: trainer.userId },
      }),
    ]);
  }

  private async findEntity(id: string): Promise<TrainerWithUser> {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      include: trainerInclude,
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    return trainer;
  }

  private toResponse(
    trainer: TrainerWithUser,
    gymId?: string,
  ): TrainerResponse {
    const trainerGyms = gymId
      ? trainer.trainerGyms.filter((link) => link.gymId === gymId)
      : trainer.trainerGyms;

    return {
      id: trainer.id,
      userId: trainer.userId,
      phone: trainer.user.phone,
      name: trainer.user.name,
      photoUrl: trainer.photoUrl,
      isActive: trainer.isActive,
      archivedAt: trainer.archivedAt,
      gyms: trainerGyms.map((link) => ({
        id: link.id,
        gymId: link.gymId,
        gymName: link.gym.name,
        gymAddress: link.gym.address,
        isActive: link.isActive,
      })),
    };
  }

  private getInitialPassword(): string {
    return this.configService.getOrThrow<string>('DEFAULT_CLIENT_PASSWORD');
  }

  private async ensurePhoneAvailable(phone: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { phone } });

    if (existing) {
      throw new ConflictException('Phone already exists');
    }
  }

  private rethrowUniquePhone(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Phone already exists');
    }
  }
}
