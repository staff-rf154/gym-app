import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

const BCRYPT_ROUNDS = 12;
const FALLBACK_PASSWORD = 'ChangeMe123!';

const trainerInclude = {
  user: true,
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

  async findAll(): Promise<TrainerResponse[]> {
    const trainers = await this.prisma.trainer.findMany({
      include: trainerInclude,
      orderBy: { createdAt: 'asc' },
    });

    return trainers.map((trainer) => this.toResponse(trainer));
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

  async remove(id: string): Promise<void> {
    const trainer = await this.findEntity(id);

    await this.prisma.$transaction(async (tx) => {
      const chats = await tx.chat.findMany({
        where: { trainerId: id },
        select: { id: true },
      });
      await tx.message.deleteMany({
        where: { chatId: { in: chats.map((chat) => chat.id) } },
      });
      await tx.chat.deleteMany({ where: { trainerId: id } });
      await tx.workoutItemResult.deleteMany({
        where: { item: { workout: { trainerId: id } } },
      });
      await tx.workoutItem.deleteMany({
        where: { workout: { trainerId: id } },
      });
      await tx.workout.deleteMany({ where: { trainerId: id } });
      await tx.workoutTemplateItem.deleteMany({
        where: { template: { trainerId: id } },
      });
      await tx.workoutTemplate.deleteMany({ where: { trainerId: id } });
      await tx.nutritionRecommendation.deleteMany({ where: { trainerId: id } });
      await tx.weightMeasurement.deleteMany({
        where: { measuredBy: trainer.userId },
      });
      await tx.notificationRecipient.deleteMany({
        where: { userId: trainer.userId },
      });
      await tx.notificationRecipient.deleteMany({
        where: { notification: { senderId: trainer.userId } },
      });
      await tx.notification.deleteMany({
        where: { senderId: trainer.userId },
      });
      await tx.refreshToken.deleteMany({ where: { userId: trainer.userId } });
      await tx.clientTrainer.deleteMany({ where: { trainerId: id } });
      await tx.trainerGym.deleteMany({ where: { trainerId: id } });
      await tx.trainer.delete({ where: { id } });
      await tx.user.delete({ where: { id: trainer.userId } });
    });
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

  private toResponse(trainer: TrainerWithUser): TrainerResponse {
    return {
      id: trainer.id,
      userId: trainer.userId,
      phone: trainer.user.phone,
      name: trainer.user.name,
      photoUrl: trainer.photoUrl,
      gyms: trainer.trainerGyms.map((link) => ({
        id: link.id,
        gymId: link.gymId,
        gymName: link.gym.name,
        gymAddress: link.gym.address,
        isActive: link.isActive,
      })),
    };
  }

  private getInitialPassword(): string {
    return (
      this.configService.get<string>('DEFAULT_CLIENT_PASSWORD') ??
      FALLBACK_PASSWORD
    );
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
