import { ForbiddenException, Injectable } from '@nestjs/common';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const clientInclude = {
  user: true,
  goalRef: true,
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
  clientGyms: {
    where: { isActive: true },
    include: { gym: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.ClientInclude;

type ClientEntity = Prisma.ClientGetPayload<{ include: typeof clientInclude }>;

export interface TrainerClientGymResponse {
  id: string;
  gymId: string;
  gymName: string;
  gymAddress: string;
  isActive: boolean;
}

export interface TrainerClientResponse {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  gender: Gender | null;
  height: number | null;
  birthdate: Date | null;
  age: number | null;
  startWeight: number | null;
  startFatMass: number | null;
  currentWeight: number | null;
  currentFatMass: number | null;
  goal: { id: string; name: string; description: string | null } | null;
  goalText: string | null;
  notes: string | null;
  gyms: TrainerClientGymResponse[];
  active_trainers: {
    id: string;
    trainerId: string;
    trainerName: string;
    gymId: string;
    gymName: string;
    isActive: boolean;
    assignedBy: string;
    assignedById: string | null;
    assignedAt: Date;
  }[];
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

@Injectable()
export class TrainerClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    gymId?: string,
    search?: string,
  ): Promise<TrainerClientResponse[]> {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    const clients = await this.prisma.client.findMany({
      where: {
        clientTrainers: {
          some: {
            trainerId: trainer.id,
            isActive: true,
            ...(gymId ? { gymId } : {}),
          },
        },
        ...(search
          ? { user: { name: { contains: search, mode: 'insensitive' as const } } }
          : {}),
      },
      include: clientInclude,
      orderBy: { createdAt: 'asc' },
    });

    return clients.map((client) => this.toResponse(client));
  }

  private toResponse(client: ClientEntity): TrainerClientResponse {
    const lastMeasurement = client.weightMeasurements[0];

    return {
      id: client.id,
      userId: client.userId,
      name: client.user.name,
      photoUrl: client.photoUrl,
      gender: client.gender,
      height: client.height,
      birthdate: client.birthdate,
      age: calculateAge(client.birthdate),
      startWeight: client.startWeight,
      startFatMass: client.startFatMass,
      currentWeight: lastMeasurement?.weight ?? null,
      currentFatMass: lastMeasurement?.fatMass ?? null,
      goal: client.goalRef
        ? {
            id: client.goalRef.id,
            name: client.goalRef.name,
            description: client.goalRef.description,
          }
        : null,
      goalText: client.goal,
      notes: client.notes,
      gyms: client.clientGyms.map((link) => ({
        id: link.id,
        gymId: link.gymId,
        gymName: link.gym.name,
        gymAddress: link.gym.address,
        isActive: link.isActive,
      })),
      active_trainers: client.clientTrainers.map((link) => ({
        id: link.id,
        trainerId: link.trainerId,
        trainerName: link.trainer.user.name,
        gymId: link.gymId,
        gymName: link.gym.name,
        isActive: link.isActive,
        assignedBy: link.assignedBy,
        assignedById: link.assignedById,
        assignedAt: link.assignedAt,
      })),
    };
  }
}
