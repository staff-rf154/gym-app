import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Exercise,
  GymEquipmentType,
  Prisma,
  Role,
  WorkoutStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { EquipmentUsageQueryDto } from './dto/equipment-usage-query.dto';
import { ExerciseProgressQueryDto } from './dto/exercise-progress-query.dto';
import { ExercisesSummaryQueryDto } from './dto/exercises-summary-query.dto';
import { TrainersReportQueryDto } from './dto/trainers-report-query.dto';
import { WeightDynamicsQueryDto } from './dto/weight-dynamics-query.dto';

export interface WeightDynamicsPoint {
  measuredAt: Date;
  weight: number;
  fatMass: number | null;
}

export interface ExerciseProgressPoint {
  date: string;
  plannedWeight: number | null;
  actualWeight: number | null;
  plannedReps: number;
  actualReps: number;
  done: boolean;
  isActualFallback: boolean;
}

export interface ExerciseProgressResponse {
  exercise: Exercise;
  points: ExerciseProgressPoint[];
}

export interface ExerciseSummaryItem {
  exerciseId: string;
  exerciseName: string;
  firstWeight: number | null;
  lastWeight: number | null;
  recordsCount: number;
}

export interface AttendanceDynamicsPoint {
  period: string;
  visits: number;
  uniqueClients: number;
}

export interface AttendanceClientItem {
  clientId: string;
  clientName: string;
  visits: number;
  lastVisitDate: string;
}

export interface AttendanceResponse {
  totalVisits: number;
  uniqueClients: number;
  dynamics: AttendanceDynamicsPoint[];
  byClient: AttendanceClientItem[];
}

export interface EquipmentUsageTypeItem {
  type: GymEquipmentType;
  usageCount: number;
  uniqueClients: number;
  share: number;
}

export interface EquipmentUsageEquipmentItem {
  equipmentId: string;
  equipmentName: string;
  type: GymEquipmentType;
  usageCount: number;
  uniqueClients: number;
  share: number;
}

export interface EquipmentUsageClientItem {
  clientId: string;
  clientName: string;
  equipmentId: string;
  equipmentName: string;
  usageCount: number;
  lastUsedDate: string;
}

export interface EquipmentUsageDynamicsPoint {
  period: string;
  usageCount: number;
}

export interface EquipmentUsageItemRef {
  equipmentId: string;
  equipmentName: string;
  usageCount: number;
}

export interface EquipmentUsageResponse {
  totalUsage: number;
  byType: EquipmentUsageTypeItem[];
  byEquipment: EquipmentUsageEquipmentItem[];
  byClient: EquipmentUsageClientItem[];
  dynamics: EquipmentUsageDynamicsPoint[];
  mostUsed: EquipmentUsageItemRef | null;
  leastUsed: EquipmentUsageItemRef | null;
}

export interface TrainerReportClientItem {
  clientId: string;
  clientName: string;
  visits: number;
}

export interface TrainerReportItem {
  trainerId: string;
  trainerName: string;
  visits: number;
  uniqueClients: number;
  clients: TrainerReportClientItem[];
}

interface ReportScope {
  gymId?: string;
  trainerId?: string;
  clientId?: string;
}

function periodKey(date: Date, unit: 'day' | 'week' | 'month'): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  if (unit === 'month') {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  if (unit === 'week') {
    const day = date.getUTCDate();
    const weekday = (date.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(year, month, day - weekday));
    return monday.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async weightDynamics(
    userId: string,
    role: string,
    query: WeightDynamicsQueryDto,
  ): Promise<WeightDynamicsPoint[]> {
    const clientId = await this.resolveClientId(userId, role, query.client_id);

    const measuredAt: Prisma.DateTimeFilter = {};

    if (query.from) {
      measuredAt.gte = new Date(`${query.from}T00:00:00.000Z`);
    }

    if (query.to) {
      measuredAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }

    const measurements = await this.prisma.weightMeasurement.findMany({
      where: {
        clientId,
        measuredAt: Object.keys(measuredAt).length ? measuredAt : undefined,
      },
      orderBy: { measuredAt: 'asc' },
    });

    return measurements.map((measurement) => ({
      measuredAt: measurement.measuredAt,
      weight: measurement.weight,
      fatMass: measurement.fatMass,
    }));
  }

  async exerciseProgress(
    userId: string,
    role: string,
    query: ExerciseProgressQueryDto,
  ): Promise<ExerciseProgressResponse> {
    const clientId = await this.resolveClientId(userId, role, query.client_id);

    const exercise = await this.prisma.exercise.findUnique({
      where: { id: query.exercise_id },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const items = await this.prisma.workoutItem.findMany({
      where: {
        exerciseId: query.exercise_id,
        workout: { clientId },
      },
      include: {
        workout: { select: { date: true } },
        result: true,
      },
      orderBy: [{ workout: { date: 'asc' } }, { order: 'asc' }],
    });

    const points = items.map((item) => {
      const result = item.result;
      const isActualFallback =
        result?.actualWeight == null && result?.actualReps == null;

      return {
        date: item.workout.date.toISOString().slice(0, 10),
        plannedWeight: item.plannedWeight,
        actualWeight: result?.actualWeight ?? item.plannedWeight,
        plannedReps: item.plannedReps,
        actualReps: result?.actualReps ?? item.plannedReps,
        done: result?.done ?? false,
        isActualFallback,
      };
    });

    return { exercise, points };
  }

  async exercisesSummary(
    userId: string,
    role: string,
    query: ExercisesSummaryQueryDto,
  ): Promise<ExerciseSummaryItem[]> {
    const clientId = await this.resolveClientId(userId, role, query.client_id);

    const items = await this.prisma.workoutItem.findMany({
      where: { workout: { clientId } },
      include: {
        exercise: { select: { id: true, name: true } },
        workout: { select: { date: true } },
        result: true,
      },
      orderBy: [{ workout: { date: 'asc' } }, { order: 'asc' }],
    });

    const summaries = new Map<string, ExerciseSummaryItem>();

    for (const item of items) {
      const weight = item.result?.actualWeight ?? item.plannedWeight;
      const existing = summaries.get(item.exerciseId);

      if (!existing) {
        summaries.set(item.exerciseId, {
          exerciseId: item.exerciseId,
          exerciseName: item.exercise.name,
          firstWeight: weight,
          lastWeight: weight,
          recordsCount: 1,
        });
        continue;
      }

      existing.recordsCount += 1;

      if (weight !== null) {
        existing.lastWeight = weight;
      }
    }

    return Array.from(summaries.values());
  }

  async attendance(
    userId: string,
    role: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceResponse> {
    const scope = await this.resolveReportScope(userId, role, query);
    const groupBy = query.group_by ?? 'day';

    const workouts = await this.prisma.workout.findMany({
      where: {
        status: WorkoutStatus.DONE,
        date: this.buildDateFilter(query.from, query.to),
        ...(scope.gymId ? { gymId: scope.gymId } : {}),
        ...(scope.trainerId ? { trainerId: scope.trainerId } : {}),
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
      },
      select: {
        date: true,
        clientId: true,
        client: { select: { user: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    const uniqueClientIds = new Set<string>();
    const dynamics = new Map<
      string,
      { visits: number; clients: Set<string> }
    >();
    const byClient = new Map<string, AttendanceClientItem>();

    for (const workout of workouts) {
      uniqueClientIds.add(workout.clientId);

      const key = periodKey(workout.date, groupBy);
      const bucket = dynamics.get(key) ?? {
        visits: 0,
        clients: new Set<string>(),
      };
      bucket.visits += 1;
      bucket.clients.add(workout.clientId);
      dynamics.set(key, bucket);

      const date = workout.date.toISOString().slice(0, 10);
      const client = byClient.get(workout.clientId);

      if (!client) {
        byClient.set(workout.clientId, {
          clientId: workout.clientId,
          clientName: workout.client.user.name,
          visits: 1,
          lastVisitDate: date,
        });
      } else {
        client.visits += 1;

        if (date > client.lastVisitDate) {
          client.lastVisitDate = date;
        }
      }
    }

    return {
      totalVisits: workouts.length,
      uniqueClients: uniqueClientIds.size,
      dynamics: Array.from(dynamics.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([period, bucket]) => ({
          period,
          visits: bucket.visits,
          uniqueClients: bucket.clients.size,
        })),
      byClient: Array.from(byClient.values()).sort(
        (left, right) =>
          right.visits - left.visits ||
          left.clientName.localeCompare(right.clientName),
      ),
    };
  }

  async equipmentUsage(
    userId: string,
    role: string,
    query: EquipmentUsageQueryDto,
  ): Promise<EquipmentUsageResponse> {
    const scope = await this.resolveReportScope(userId, role, query);
    const period = query.period ?? 'day';

    const items = await this.prisma.workoutItem.findMany({
      where: {
        equipmentId: { not: null },
        workout: {
          status: WorkoutStatus.DONE,
          date: this.buildDateFilter(query.from, query.to),
          ...(scope.gymId ? { gymId: scope.gymId } : {}),
          ...(scope.trainerId ? { trainerId: scope.trainerId } : {}),
          ...(scope.clientId ? { clientId: scope.clientId } : {}),
        },
      },
      include: {
        equipment: { select: { id: true, name: true, type: true } },
        workout: {
          select: {
            date: true,
            clientId: true,
            client: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    const totalUsage = items.length;
    const typeMap = new Map<
      GymEquipmentType,
      { usageCount: number; clients: Set<string> }
    >();
    const equipmentMap = new Map<
      string,
      {
        equipmentName: string;
        type: GymEquipmentType;
        usageCount: number;
        clients: Set<string>;
      }
    >();
    const clientMap = new Map<string, EquipmentUsageClientItem>();
    const dynamicsMap = new Map<string, number>();

    for (const item of items) {
      if (!item.equipment) {
        continue;
      }

      const equipment = item.equipment;
      const clientId = item.workout.clientId;
      const clientName = item.workout.client.user.name;
      const date = item.workout.date.toISOString().slice(0, 10);

      const type = typeMap.get(equipment.type) ?? {
        usageCount: 0,
        clients: new Set<string>(),
      };
      type.usageCount += 1;
      type.clients.add(clientId);
      typeMap.set(equipment.type, type);

      const equipmentEntry = equipmentMap.get(equipment.id) ?? {
        equipmentName: equipment.name,
        type: equipment.type,
        usageCount: 0,
        clients: new Set<string>(),
      };
      equipmentEntry.usageCount += 1;
      equipmentEntry.clients.add(clientId);
      equipmentMap.set(equipment.id, equipmentEntry);

      const clientKey = `${clientId}:${equipment.id}`;
      const existingClient = clientMap.get(clientKey);

      if (!existingClient) {
        clientMap.set(clientKey, {
          clientId,
          clientName,
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          usageCount: 1,
          lastUsedDate: date,
        });
      } else {
        existingClient.usageCount += 1;

        if (date > existingClient.lastUsedDate) {
          existingClient.lastUsedDate = date;
        }
      }

      const key = periodKey(item.workout.date, period);
      dynamicsMap.set(key, (dynamicsMap.get(key) ?? 0) + 1);
    }

    const share = (count: number) =>
      totalUsage === 0 ? 0 : Number((count / totalUsage).toFixed(4));

    const byEquipment = Array.from(equipmentMap.entries())
      .map(([equipmentId, entry]) => ({
        equipmentId,
        equipmentName: entry.equipmentName,
        type: entry.type,
        usageCount: entry.usageCount,
        uniqueClients: entry.clients.size,
        share: share(entry.usageCount),
      }))
      .sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          left.equipmentName.localeCompare(right.equipmentName),
      );

    const lastEquipment = byEquipment[byEquipment.length - 1];

    return {
      totalUsage,
      byType: Array.from(typeMap.entries())
        .map(([type, entry]) => ({
          type,
          usageCount: entry.usageCount,
          uniqueClients: entry.clients.size,
          share: share(entry.usageCount),
        }))
        .sort((left, right) => right.usageCount - left.usageCount),
      byEquipment,
      byClient: Array.from(clientMap.values()).sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          left.clientName.localeCompare(right.clientName) ||
          left.equipmentName.localeCompare(right.equipmentName),
      ),
      dynamics: Array.from(dynamicsMap.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([periodKeyValue, usageCount]) => ({
          period: periodKeyValue,
          usageCount,
        })),
      mostUsed: byEquipment[0]
        ? {
            equipmentId: byEquipment[0].equipmentId,
            equipmentName: byEquipment[0].equipmentName,
            usageCount: byEquipment[0].usageCount,
          }
        : null,
      leastUsed: lastEquipment
        ? {
            equipmentId: lastEquipment.equipmentId,
            equipmentName: lastEquipment.equipmentName,
            usageCount: lastEquipment.usageCount,
          }
        : null,
    };
  }

  async trainersReport(
    userId: string,
    role: string,
    query: TrainersReportQueryDto,
  ): Promise<TrainerReportItem[]> {
    const scope = await this.resolveReportScope(userId, role, query);

    let trainerIds: string[];

    if (scope.trainerId) {
      trainerIds = [scope.trainerId];
    } else if (scope.gymId) {
      const links = await this.prisma.trainerGym.findMany({
        where: { gymId: scope.gymId, isActive: true },
        select: { trainerId: true },
      });
      trainerIds = links.map((link) => link.trainerId);
    } else {
      const trainers = await this.prisma.trainer.findMany({
        select: { id: true },
      });
      trainerIds = trainers.map((trainer) => trainer.id);
    }

    if (trainerIds.length === 0) {
      return [];
    }

    const trainers = await this.prisma.trainer.findMany({
      where: { id: { in: trainerIds } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: 'asc' } },
    });

    const rows = new Map<string, TrainerReportItem>();

    for (const trainer of trainers) {
      rows.set(trainer.id, {
        trainerId: trainer.id,
        trainerName: trainer.user.name,
        visits: 0,
        uniqueClients: 0,
        clients: [],
      });
    }

    const workouts = await this.prisma.workout.findMany({
      where: {
        status: WorkoutStatus.DONE,
        trainerId: { in: trainerIds },
        date: this.buildDateFilter(query.from, query.to),
        ...(scope.gymId ? { gymId: scope.gymId } : {}),
      },
      select: {
        trainerId: true,
        clientId: true,
        client: { select: { user: { select: { name: true } } } },
      },
    });

    const clientsByTrainer = new Map<
      string,
      Map<string, TrainerReportClientItem>
    >();

    for (const workout of workouts) {
      const row = rows.get(workout.trainerId);

      if (!row) {
        continue;
      }

      row.visits += 1;

      let clients = clientsByTrainer.get(workout.trainerId);

      if (!clients) {
        clients = new Map<string, TrainerReportClientItem>();
        clientsByTrainer.set(workout.trainerId, clients);
      }

      const existing = clients.get(workout.clientId);

      if (existing) {
        existing.visits += 1;
      } else {
        clients.set(workout.clientId, {
          clientId: workout.clientId,
          clientName: workout.client.user.name,
          visits: 1,
        });
      }
    }

    const result = Array.from(rows.values());

    for (const row of result) {
      const clients = clientsByTrainer.get(row.trainerId);
      row.clients = clients
        ? Array.from(clients.values()).sort(
            (left, right) =>
              right.visits - left.visits ||
              left.clientName.localeCompare(right.clientName),
          )
        : [];
      row.uniqueClients = row.clients.length;
    }

    return result.sort(
      (left, right) =>
        right.visits - left.visits ||
        left.trainerName.localeCompare(right.trainerName),
    );
  }

  private buildDateFilter(
    from?: string,
    to?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }

    const filter: Prisma.DateTimeFilter = {};

    if (from) {
      filter.gte = new Date(`${from}T00:00:00.000Z`);
    }

    if (to) {
      filter.lte = new Date(`${to}T23:59:59.999Z`);
    }

    return filter;
  }

  private async resolveReportScope(
    userId: string,
    role: string,
    filters: { gym_id?: string; trainer_id?: string; client_id?: string },
  ): Promise<ReportScope> {
    if (role === Role.ADMIN) {
      return {
        gymId: filters.gym_id,
        trainerId: filters.trainer_id,
        clientId: filters.client_id,
      };
    }

    if (role === Role.RECEPTION) {
      const reception = await this.prisma.reception.findUnique({
        where: { userId },
      });

      if (!reception) {
        throw new ForbiddenException('Reception profile not found');
      }

      if (filters.gym_id && filters.gym_id !== reception.gymId) {
        throw new ForbiddenException('Gym access denied');
      }

      if (filters.client_id) {
        const link = await this.prisma.clientGym.findFirst({
          where: {
            clientId: filters.client_id,
            gymId: reception.gymId,
            isActive: true,
          },
        });

        if (!link) {
          throw new ForbiddenException('Client is not active in your gym');
        }
      }

      if (filters.trainer_id) {
        const link = await this.prisma.trainerGym.findFirst({
          where: {
            trainerId: filters.trainer_id,
            gymId: reception.gymId,
            isActive: true,
          },
        });

        if (!link) {
          throw new ForbiddenException('Trainer is not active in your gym');
        }
      }

      return {
        gymId: reception.gymId,
        trainerId: filters.trainer_id,
        clientId: filters.client_id,
      };
    }

    if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
      });

      if (!trainer) {
        throw new ForbiddenException('Trainer profile not found');
      }

      if (filters.trainer_id && filters.trainer_id !== trainer.id) {
        throw new ForbiddenException('Trainer access denied');
      }

      if (filters.client_id) {
        const link = await this.prisma.clientTrainer.findFirst({
          where: {
            clientId: filters.client_id,
            trainerId: trainer.id,
            isActive: true,
            ...(filters.gym_id ? { gymId: filters.gym_id } : {}),
          },
        });

        if (!link) {
          throw new ForbiddenException('Trainer not linked to client');
        }
      }

      if (filters.gym_id) {
        const link = await this.prisma.trainerGym.findFirst({
          where: {
            trainerId: trainer.id,
            gymId: filters.gym_id,
            isActive: true,
          },
        });

        if (!link) {
          throw new ForbiddenException('Gym access denied');
        }
      }

      return {
        gymId: filters.gym_id,
        trainerId: trainer.id,
        clientId: filters.client_id,
      };
    }

    throw new ForbiddenException('Reports access denied');
  }

  private async resolveClientId(
    userId: string,
    role: string,
    clientId?: string,
  ): Promise<string> {
    if (role === Role.CLIENT) {
      const client = await this.prisma.client.findUnique({ where: { userId } });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      return client.id;
    }

    if (!clientId) {
      throw new BadRequestException('client_id is required');
    }

    if (role === Role.RECEPTION) {
      const reception = await this.prisma.reception.findUnique({
        where: { userId },
      });

      if (!reception) {
        throw new ForbiddenException('Reception profile not found');
      }

      const link = await this.prisma.clientGym.findFirst({
        where: {
          clientId,
          gymId: reception.gymId,
          isActive: true,
        },
      });

      if (!link) {
        throw new ForbiddenException('Client is not active in your gym');
      }

      return clientId;
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { userId },
      });

      const link = trainer
        ? await this.prisma.clientTrainer.findFirst({
            where: {
              clientId,
              trainerId: trainer.id,
              isActive: true,
            },
          })
        : null;

      if (!link) {
        throw new ForbiddenException('Trainer not linked to client');
      }
    }

    return clientId;
  }
}
