import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Exercise, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExerciseProgressQueryDto } from './dto/exercise-progress-query.dto';
import { ExercisesSummaryQueryDto } from './dto/exercises-summary-query.dto';
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
