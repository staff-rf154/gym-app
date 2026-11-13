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
import { CACHE_TTL, RedisService } from '../redis/redis.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async weightDynamics(
    userId: string,
    role: string,
    query: WeightDynamicsQueryDto,
  ): Promise<WeightDynamicsPoint[]> {
    return this.redis.getOrSet(
      this.reportCacheKey('weight-dynamics', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeWeightDynamics(userId, role, query),
    );
  }

  private async computeWeightDynamics(
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
    return this.redis.getOrSet(
      this.reportCacheKey('exercise-progress', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeExerciseProgress(userId, role, query),
    );
  }

  private async computeExerciseProgress(
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
    return this.redis.getOrSet(
      this.reportCacheKey('exercises-summary', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeExercisesSummary(userId, role, query),
    );
  }

  private async computeExercisesSummary(
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
    return this.redis.getOrSet(
      this.reportCacheKey('attendance', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeAttendance(userId, role, query),
    );
  }

  private async computeAttendance(
    userId: string,
    role: string,
    query: AttendanceQueryDto,
  ): Promise<AttendanceResponse> {
    const scope = await this.resolveReportScope(userId, role, query);
    this.assertPeriod(query.from, query.to);
    const groupBy = query.group_by ?? 'day';
    const where: Prisma.WorkoutWhereInput = {
      status: WorkoutStatus.DONE,
      date: this.buildDateFilter(query.from, query.to),
      ...(scope.gymId ? { gymId: scope.gymId } : {}),
      ...(scope.trainerId ? { trainerId: scope.trainerId } : {}),
      ...(scope.clientId ? { clientId: scope.clientId } : {}),
    };

    const clientRows = await this.prisma.workout.groupBy({
      by: ['clientId'],
      where,
      _count: { _all: true },
      _max: { date: true },
    });

    const totalVisits = clientRows.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const clientIds = clientRows.map((row) => row.clientId);
    const clients =
      clientIds.length > 0
        ? await this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, user: { select: { name: true } } },
          })
        : [];
    const names = new Map(
      clients.map((client) => [client.id, client.user.name]),
    );

    const byClient: AttendanceClientItem[] = clientRows
      .map((row) => ({
        clientId: row.clientId,
        clientName: names.get(row.clientId) ?? '',
        visits: row._count._all,
        lastVisitDate: (row._max.date ?? new Date())
          .toISOString()
          .slice(0, 10),
      }))
      .sort(
        (left, right) =>
          right.visits - left.visits ||
          left.clientName.localeCompare(right.clientName),
      );

    const conditions = this.buildWorkoutSqlConditions(
      query.from,
      query.to,
      scope,
    );
    const periodFormat = groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const dynamics = await this.prisma.$queryRaw<AttendanceDynamicsPoint[]>(
      Prisma.sql`
        SELECT
          to_char(date_trunc(${Prisma.raw(`'${groupBy}'`)}, w.date), ${Prisma.raw(`'${periodFormat}'`)}) AS period,
          COUNT(*)::int AS visits,
          COUNT(DISTINCT w."clientId")::int AS "uniqueClients"
        FROM "Workout" w
        WHERE ${Prisma.join(conditions, ' AND ')}
        GROUP BY 1
        ORDER BY 1
      `,
    );

    return {
      totalVisits,
      uniqueClients: clientRows.length,
      dynamics,
      byClient,
    };
  }

  async equipmentUsage(
    userId: string,
    role: string,
    query: EquipmentUsageQueryDto,
  ): Promise<EquipmentUsageResponse> {
    return this.redis.getOrSet(
      this.reportCacheKey('equipment-usage', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeEquipmentUsage(userId, role, query),
    );
  }

  private async computeEquipmentUsage(
    userId: string,
    role: string,
    query: EquipmentUsageQueryDto,
  ): Promise<EquipmentUsageResponse> {
    const scope = await this.resolveReportScope(userId, role, query);
    this.assertPeriod(query.from, query.to);
    const period = query.period ?? 'day';
    const conditions = this.buildWorkoutSqlConditions(
      query.from,
      query.to,
      scope,
    );
    const base = Prisma.sql`
      FROM "WorkoutItem" wi
      JOIN "Workout" w ON w.id = wi."workoutId"
      JOIN "GymEquipment" e ON e.id = wi."equipmentId"
      JOIN "Client" c ON c.id = w."clientId"
      JOIN "User" u ON u.id = c."userId"
      WHERE wi."equipmentId" IS NOT NULL
        AND ${Prisma.join(conditions, ' AND ')}
    `;

    const [totalRow] = await this.prisma.$queryRaw<{ total: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS total ${base}`,
    );
    const totalUsage = totalRow?.total ?? 0;

    const typeRows = await this.prisma.$queryRaw<
      Array<{ type: GymEquipmentType; usageCount: number; uniqueClients: number }>
    >(Prisma.sql`
      SELECT
        e.type AS type,
        COUNT(*)::int AS "usageCount",
        COUNT(DISTINCT w."clientId")::int AS "uniqueClients"
      ${base}
      GROUP BY e.type
      ORDER BY "usageCount" DESC
    `);

    const equipmentRows = await this.prisma.$queryRaw<
      Array<{
        equipmentId: string;
        equipmentName: string;
        type: GymEquipmentType;
        usageCount: number;
        uniqueClients: number;
      }>
    >(Prisma.sql`
      SELECT
        e.id AS "equipmentId",
        e.name AS "equipmentName",
        e.type AS type,
        COUNT(*)::int AS "usageCount",
        COUNT(DISTINCT w."clientId")::int AS "uniqueClients"
      ${base}
      GROUP BY e.id, e.name, e.type
      ORDER BY "usageCount" DESC, e.name ASC
    `);

    const clientRows = await this.prisma.$queryRaw<
      Array<{
        clientId: string;
        clientName: string;
        equipmentId: string;
        equipmentName: string;
        usageCount: number;
        lastUsedDate: string;
      }>
    >(Prisma.sql`
      SELECT
        w."clientId" AS "clientId",
        u.name AS "clientName",
        e.id AS "equipmentId",
        e.name AS "equipmentName",
        COUNT(*)::int AS "usageCount",
        to_char(MAX(w.date), 'YYYY-MM-DD') AS "lastUsedDate"
      ${base}
      GROUP BY w."clientId", u.name, e.id, e.name
      ORDER BY "usageCount" DESC, u.name ASC, e.name ASC
    `);

    const periodFormat = period === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const dynamics = await this.prisma.$queryRaw<
      EquipmentUsageDynamicsPoint[]
    >(Prisma.sql`
      SELECT
        to_char(date_trunc(${Prisma.raw(`'${period}'`)}, w.date), ${Prisma.raw(`'${periodFormat}'`)}) AS period,
        COUNT(*)::int AS "usageCount"
      ${base}
      GROUP BY 1
      ORDER BY 1
    `);

    const share = (count: number) =>
      totalUsage === 0 ? 0 : Number((count / totalUsage).toFixed(4));
    const byType = typeRows.map((row) => ({
      ...row,
      share: share(row.usageCount),
    }));
    const byEquipment = equipmentRows.map((row) => ({
      ...row,
      share: share(row.usageCount),
    }));
    const lastEquipment = byEquipment[byEquipment.length - 1];

    return {
      totalUsage,
      byType,
      byEquipment,
      byClient: clientRows,
      dynamics,
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
    return this.redis.getOrSet(
      this.reportCacheKey('trainers', userId, role, query),
      CACHE_TTL.reports,
      () => this.computeTrainersReport(userId, role, query),
    );
  }

  private async computeTrainersReport(
    userId: string,
    role: string,
    query: TrainersReportQueryDto,
  ): Promise<TrainerReportItem[]> {
    const scope = await this.resolveReportScope(userId, role, query);
    this.assertPeriod(query.from, query.to);

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

    const groups = await this.prisma.workout.groupBy({
      by: ['trainerId', 'clientId'],
      where: {
        status: WorkoutStatus.DONE,
        trainerId: { in: trainerIds },
        date: this.buildDateFilter(query.from, query.to),
        ...(scope.gymId ? { gymId: scope.gymId } : {}),
      },
      _count: { _all: true },
    });

    const clientIds = [...new Set(groups.map((group) => group.clientId))];
    const clients =
      clientIds.length > 0
        ? await this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, user: { select: { name: true } } },
          })
        : [];
    const clientNames = new Map(
      clients.map((client) => [client.id, client.user.name]),
    );

    const rows = new Map<string, TrainerReportItem>();
    const clientsByTrainer = new Map<
      string,
      Map<string, TrainerReportClientItem>
    >();

    for (const trainer of trainers) {
      rows.set(trainer.id, {
        trainerId: trainer.id,
        trainerName: trainer.user.name,
        visits: 0,
        uniqueClients: 0,
        clients: [],
      });
    }

    for (const group of groups) {
      const row = rows.get(group.trainerId);

      if (!row) {
        continue;
      }

      const visits = group._count._all;
      row.visits += visits;

      let clients = clientsByTrainer.get(group.trainerId);

      if (!clients) {
        clients = new Map<string, TrainerReportClientItem>();
        clientsByTrainer.set(group.trainerId, clients);
      }

      clients.set(group.clientId, {
        clientId: group.clientId,
        clientName: clientNames.get(group.clientId) ?? '',
        visits,
      });
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

  private reportCacheKey(
    report: string,
    userId: string,
    role: string,
    query: object,
  ): string {
    const params = Object.entries(query as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([left], [right]) => left.localeCompare(right));

    return `cache:reports:${report}:${userId}:${role}:${JSON.stringify(params)}`;
  }

  private assertPeriod(from?: string, to?: string): void {
    if (!from || !to) {
      throw new BadRequestException('from and to are required');
    }

    if (new Date(from).getTime() > new Date(to).getTime()) {
      throw new BadRequestException('from must be less than or equal to to');
    }
  }

  private buildWorkoutSqlConditions(
    from: string | undefined,
    to: string | undefined,
    scope: ReportScope,
  ): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [Prisma.sql`w.status = 'DONE'`];

    if (from) {
      conditions.push(
        Prisma.sql`w.date >= ${new Date(`${from}T00:00:00.000Z`)}`,
      );
    }

    if (to) {
      conditions.push(
        Prisma.sql`w.date <= ${new Date(`${to}T23:59:59.999Z`)}`,
      );
    }

    if (scope.gymId) {
      conditions.push(Prisma.sql`w."gymId" = ${scope.gymId}::uuid`);
    }

    if (scope.trainerId) {
      conditions.push(Prisma.sql`w."trainerId" = ${scope.trainerId}::uuid`);
    }

    if (scope.clientId) {
      conditions.push(Prisma.sql`w."clientId" = ${scope.clientId}::uuid`);
    }

    return conditions;
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
