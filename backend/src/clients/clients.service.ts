import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gender, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const BCRYPT_ROUNDS = 10;
const FALLBACK_PASSWORD = 'ChangeMe123!';

const clientInclude = {
  user: true,
  clientTrainers: {
    where: { isActive: true },
    include: {
      trainer: { include: { user: true } },
      gym: true,
    },
  },
  weightMeasurements: {
    orderBy: { measuredAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.ClientInclude;

type ClientWithRelations = Prisma.ClientGetPayload<{
  include: typeof clientInclude;
}>;

export interface ClientTrainerLinkResponse {
  id: string;
  trainerId: string;
  trainerName: string;
  gymId: string;
  gymName: string;
  isActive: boolean;
  assignedAt: Date;
}

export interface ClientResponse {
  id: string;
  userId: string;
  phone: string;
  name: string;
  gender: Gender | null;
  height: number | null;
  birthdate: Date | null;
  age: number | null;
  startWeight: number | null;
  startFatMass: number | null;
  currentWeight: number | null;
  currentFatMass: number | null;
  goal: string | null;
  notes: string | null;
  active_trainers: ClientTrainerLinkResponse[];
}

export interface CreateClientResponse extends ClientResponse {
  initial_password: string;
}

function calculateAge(birthdate: Date | null): number | null {
  if (!birthdate) {
    return null;
  }

  const now = new Date();
  let age = now.getUTCFullYear() - birthdate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthdate.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birthdate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function parseBirthdate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<ClientResponse[]> {
    const clients = await this.prisma.client.findMany({
      include: clientInclude,
      orderBy: { createdAt: 'asc' },
    });

    return clients.map((client) => this.toResponse(client));
  }

  async findOne(id: string): Promise<ClientResponse> {
    const client = await this.findEntity(id);

    return this.toResponse(client);
  }

  async create(dto: CreateClientDto): Promise<CreateClientResponse> {
    await this.ensurePhoneAvailable(dto.phone);

    const initialPassword = this.getInitialPassword();
    const passwordHash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);

    try {
      const client = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone: dto.phone,
            passwordHash,
            role: Role.CLIENT,
            name: dto.name,
          },
        });

        return tx.client.create({
          data: {
            userId: user.id,
            gender: dto.gender,
            height: dto.height,
            birthdate: parseBirthdate(dto.birthdate),
            startWeight: dto.startWeight,
            startFatMass: dto.startFatMass,
            goal: dto.goal,
            notes: dto.notes,
          },
        });
      });

      const created = await this.findEntity(client.id);

      return {
        ...this.toResponse(created),
        initial_password: initialPassword,
      };
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientResponse> {
    const client = await this.findEntity(id);
    const phone = dto.phone ?? client.user.phone;

    if (phone !== client.user.phone) {
      await this.ensurePhoneAvailable(phone);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: client.userId },
          data: {
            phone: dto.phone,
            name: dto.name,
          },
        });

        await tx.client.update({
          where: { id },
          data: {
            gender: dto.gender,
            height: dto.height,
            birthdate: parseBirthdate(dto.birthdate),
            startWeight: dto.startWeight,
            startFatMass: dto.startFatMass,
            goal: dto.goal,
            notes: dto.notes,
          },
        });
      });
    } catch (error) {
      this.rethrowUniquePhone(error);
      throw error;
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const client = await this.findEntity(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.clientTrainer.deleteMany({ where: { clientId: id } });
      await tx.weightMeasurement.deleteMany({ where: { clientId: id } });
      await tx.client.delete({ where: { id } });
      await tx.user.delete({ where: { id: client.userId } });
    });
  }

  private async findEntity(id: string): Promise<ClientWithRelations> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: clientInclude,
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  private toResponse(client: ClientWithRelations): ClientResponse {
    const lastMeasurement = client.weightMeasurements[0];

    return {
      id: client.id,
      userId: client.userId,
      phone: client.user.phone,
      name: client.user.name,
      gender: client.gender,
      height: client.height,
      birthdate: client.birthdate,
      age: calculateAge(client.birthdate),
      startWeight: client.startWeight,
      startFatMass: client.startFatMass,
      currentWeight: lastMeasurement?.weight ?? null,
      currentFatMass: lastMeasurement?.fatMass ?? null,
      goal: client.goal,
      notes: client.notes,
      active_trainers: client.clientTrainers.map((link) => ({
        id: link.id,
        trainerId: link.trainerId,
        trainerName: link.trainer.user.name,
        gymId: link.gymId,
        gymName: link.gym.name,
        isActive: link.isActive,
        assignedAt: link.assignedAt,
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
