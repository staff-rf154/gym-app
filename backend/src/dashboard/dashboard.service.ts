import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardStats {
  gyms: number;
  activeGyms: number;
  trainers: number;
  clients: number;
  equipment: number;
  workouts: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [gyms, activeGyms, trainers, clients, equipment, workouts] =
      await Promise.all([
        this.prisma.gym.count(),
        this.prisma.gym.count({ where: { isActive: true } }),
        this.prisma.trainer.count(),
        this.prisma.client.count(),
        this.prisma.gymEquipment.count(),
        this.prisma.workout.count(),
      ]);

    return { gyms, activeGyms, trainers, clients, equipment, workouts };
  }
}
