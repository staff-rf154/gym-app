import { Injectable } from '@nestjs/common';
import { Role, WorkoutStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

export interface DashboardReportSummary {
  from: string;
  to: string;
  visits: number;
  uniqueClients: number;
  activeTrainers: number;
  equipmentUsage: number;
  workouts: number;
}

export interface DashboardStats {
  gyms: number;
  activeGyms: number;
  trainers: number;
  clients: number;
  equipment: number;
  workouts: number;
  report: DashboardReportSummary;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousWeekRange(): { from: string; to: string } {
  const today = new Date();
  const weekday = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - weekday - 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { from: dateKey(monday), to: dateKey(sunday) };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(
    userId: string,
    role: string,
    query: DashboardQueryDto = {},
  ): Promise<DashboardStats> {
    const gymId =
      role === Role.ADMINISTRATOR
        ? (
            await this.prisma.administrator.findUnique({
              where: { userId },
              select: { gymId: true },
            })
          )?.gymId
        : undefined;

    const gymScope = gymId ? { gymId } : {};
    const period = query.from && query.to
      ? { from: query.from, to: query.to }
      : previousWeekRange();
    const from = new Date(`${period.from}T00:00:00.000Z`);
    const to = new Date(`${period.to}T23:59:59.999Z`);

    const workoutWhere = {
      ...gymScope,
      status: {
        in: [WorkoutStatus.COMPLETED, WorkoutStatus.AUTO_CLOSED],
      },
      date: { gte: from, lte: to },
    };

    const [
      gyms,
      activeGyms,
      trainers,
      clients,
      equipment,
      workouts,
      visits,
      uniqueClients,
      activeTrainers,
      equipmentUsage,
      periodWorkouts,
    ] = await Promise.all([
      gymId ? Promise.resolve(1) : this.prisma.gym.count(),
      gymId
        ? this.prisma.gym.count({ where: { id: gymId, isActive: true } })
        : this.prisma.gym.count({ where: { isActive: true } }),
      gymId
        ? this.prisma.trainerGym.count({ where: { gymId, isActive: true } })
        : this.prisma.trainer.count(),
      gymId
        ? this.prisma.clientGym.count({ where: { gymId, isActive: true } })
        : this.prisma.client.count(),
      gymId
        ? this.prisma.gymEquipment.count({ where: { gymId } })
        : this.prisma.gymEquipment.count(),
      gymId
        ? this.prisma.workout.count({ where: { gymId } })
        : this.prisma.workout.count(),
      this.prisma.workout.count({ where: workoutWhere }),
      this.prisma.workout
        .findMany({
          where: workoutWhere,
          distinct: ['clientId'],
          select: { clientId: true },
        })
        .then((rows) => rows.length),
      this.prisma.workout
        .findMany({
          where: workoutWhere,
          distinct: ['trainerId'],
          select: { trainerId: true },
        })
        .then((rows) => rows.filter((row) => row.trainerId !== null).length),
      this.prisma.workoutItem.count({
        where: {
          equipmentId: { not: null },
          workout: workoutWhere,
        },
      }),
      this.prisma.workout.count({
        where: { ...gymScope, date: { gte: from, lte: to } },
      }),
    ]);

    return {
      gyms,
      activeGyms,
      trainers,
      clients,
      equipment,
      workouts,
      report: {
        from: period.from,
        to: period.to,
        visits,
        uniqueClients,
        activeTrainers,
        equipmentUsage,
        workouts: periodWorkouts,
      },
    };
  }
}
