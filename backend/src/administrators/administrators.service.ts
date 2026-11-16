import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

const BCRYPT_ROUNDS = 12;

const administratorInclude = {
  user: { select: { phone: true, name: true } },
  gym: true,
} satisfies Prisma.AdministratorInclude;

type AdministratorEntity = Prisma.AdministratorGetPayload<{
  include: typeof administratorInclude;
}>;

export interface AdministratorResponse {
  id: string;
  userId: string;
  phone: string;
  name: string;
  gymId: string;
  gymName: string;
  createdAt: Date;
}

export interface CreateAdministratorResponse extends AdministratorResponse {
  initial_password: string;
}

@Injectable()
export class AdministratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<AdministratorResponse[]> {
    const administrators = await this.prisma.administrator.findMany({
      include: administratorInclude,
      orderBy: { createdAt: 'asc' },
    });

    return administrators.map((administrator) => this.toResponse(administrator));
  }

  async findOne(id: string): Promise<AdministratorResponse> {
    return this.toResponse(await this.findEntity(id));
  }

  async create(dto: CreateAdministratorDto): Promise<CreateAdministratorResponse> {
    await this.ensurePhoneAvailable(dto.phone);
    await this.ensureGymExists(dto.gym_id);

    const initialPassword =
      dto.password ??
      this.configService.getOrThrow<string>('DEFAULT_CLIENT_PASSWORD');
    const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);

    try {
      const administrator = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            passwordHash,
            role: Role.ADMINISTRATOR,
            name: dto.name,
          },
        });

        return tx.administrator.create({
          data: { userId: user.id, gymId: dto.gym_id },
        });
      });

      const created = await this.findEntity(administrator.id);

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
    dto: UpdateAdministratorDto,
  ): Promise<AdministratorResponse> {
    const administrator = await this.findEntity(id);
    const phone = dto.phone ?? administrator.user.phone;

    if (phone !== administrator.user.phone) {
      await this.ensurePhoneAvailable(phone);
    }

    if (dto.gym_id && dto.gym_id !== administrator.gymId) {
      await this.ensureGymExists(dto.gym_id);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
      : undefined;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: administrator.userId },
          data: {
            phone: dto.phone,
            name: dto.name,
            passwordHash,
          },
        });

        if (dto.gym_id) {
          await tx.administrator.update({
            where: { id },
            data: { gymId: dto.gym_id },
          });
        }

        if (passwordHash) {
          await tx.refreshToken.deleteMany({
            where: { userId: administrator.userId },
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
    const administrator = await this.findEntity(id);
    const newPassword =
      password ??
      this.configService.getOrThrow<string>('DEFAULT_CLIENT_PASSWORD');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: administrator.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: administrator.userId },
      }),
    ]);

    return { new_password: newPassword };
  }

  async remove(id: string): Promise<void> {
    const administrator = await this.findEntity(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: { userId: administrator.userId },
      });
      await tx.notificationRecipient.deleteMany({
        where: { userId: administrator.userId },
      });
      await tx.administrator.delete({ where: { id } });
      await tx.user.delete({ where: { id: administrator.userId } });
    });
  }

  private async findEntity(id: string): Promise<AdministratorEntity> {
    const administrator = await this.prisma.administrator.findUnique({
      where: { id },
      include: administratorInclude,
    });

    if (!administrator) {
      throw new NotFoundException('Administrator not found');
    }

    return administrator;
  }

  private toResponse(administrator: AdministratorEntity): AdministratorResponse {
    return {
      id: administrator.id,
      userId: administrator.userId,
      phone: administrator.user.phone,
      name: administrator.user.name,
      gymId: administrator.gymId,
      gymName: administrator.gym.name,
      createdAt: administrator.createdAt,
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
