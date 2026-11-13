import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';

const BCRYPT_ROUNDS = 12;

const receptionInclude = {
  user: { select: { phone: true, name: true } },
  gym: true,
} satisfies Prisma.ReceptionInclude;

type ReceptionEntity = Prisma.ReceptionGetPayload<{
  include: typeof receptionInclude;
}>;

export interface ReceptionResponse {
  id: string;
  userId: string;
  phone: string;
  name: string;
  gymId: string;
  gymName: string;
  createdAt: Date;
}

export interface CreateReceptionResponse extends ReceptionResponse {
  initial_password: string;
}

@Injectable()
export class ReceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<ReceptionResponse[]> {
    const receptions = await this.prisma.reception.findMany({
      include: receptionInclude,
      orderBy: { createdAt: 'asc' },
    });

    return receptions.map((reception) => this.toResponse(reception));
  }

  async findOne(id: string): Promise<ReceptionResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async create(dto: CreateReceptionDto): Promise<CreateReceptionResponse> {
    await this.ensurePhoneAvailable(dto.phone);
    await this.ensureGymExists(dto.gym_id);

    const initialPassword =
      dto.password ??
      this.configService.getOrThrow<string>('DEFAULT_CLIENT_PASSWORD');
    const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);

    try {
      const reception = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            passwordHash,
            role: Role.RECEPTION,
            name: dto.name,
          },
        });

        return tx.reception.create({
          data: { userId: user.id, gymId: dto.gym_id },
        });
      });

      const created = await this.findEntity(reception.id);

      return {
        ...this.toResponse(created),
        initial_password: initialPassword,
      };
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateReceptionDto,
  ): Promise<ReceptionResponse> {
    const reception = await this.findEntity(id);
    const phone = dto.phone ?? reception.user.phone;

    if (phone !== reception.user.phone) {
      await this.ensurePhoneAvailable(phone);
    }

    if (dto.gym_id && dto.gym_id !== reception.gymId) {
      await this.ensureGymExists(dto.gym_id);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : undefined;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: reception.userId },
          data: {
            phone: dto.phone,
            name: dto.name,
            passwordHash,
          },
        });

        if (dto.gym_id) {
          await tx.reception.update({
            where: { id },
            data: { gymId: dto.gym_id },
          });
        }

        if (passwordHash) {
          await tx.refreshToken.deleteMany({
            where: { userId: reception.userId },
          });
        }
      });
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }

    return this.findOne(id);
  }

  async resetPassword(
    id: string,
    password?: string,
  ): Promise<{ new_password: string }> {
    const reception = await this.findEntity(id);
    const newPassword =
      password ??
      this.configService.getOrThrow<string>('DEFAULT_CLIENT_PASSWORD');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reception.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: reception.userId },
      }),
    ]);

    return { new_password: newPassword };
  }

  async remove(id: string): Promise<void> {
    const reception = await this.findEntity(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: { userId: reception.userId },
      });
      await tx.notificationRecipient.deleteMany({
        where: { userId: reception.userId },
      });
      await tx.reception.delete({ where: { id } });
      await tx.user.delete({ where: { id: reception.userId } });
    });
  }

  private async findEntity(id: string): Promise<ReceptionEntity> {
    const reception = await this.prisma.reception.findUnique({
      where: { id },
      include: receptionInclude,
    });

    if (!reception) {
      throw new NotFoundException('Reception not found');
    }

    return reception;
  }

  private toResponse(reception: ReceptionEntity): ReceptionResponse {
    return {
      id: reception.id,
      userId: reception.userId,
      phone: reception.user.phone,
      name: reception.user.name,
      gymId: reception.gymId,
      gymName: reception.gym.name,
      createdAt: reception.createdAt,
    };
  }

  private async ensureGymExists(gymId: string): Promise<void> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
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
