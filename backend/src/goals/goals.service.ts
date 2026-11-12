import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

export interface ClientGoalResponse {
  id: string;
  name: string;
  description: string | null;
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findActive(): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Goal> {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    return goal;
  }

  async create(dto: CreateGoalDto): Promise<Goal> {
    try {
      return await this.prisma.goal.create({
        data: {
          name: dto.name.trim(),
          description: dto.description,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateGoalDto): Promise<Goal> {
    await this.findOne(id);

    try {
      return await this.prisma.goal.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const clientsCount = await this.prisma.client.count({
      where: { goalId: id },
    });

    if (clientsCount > 0) {
      throw new ConflictException('Goal is used by clients');
    }

    await this.prisma.goal.delete({ where: { id } });
  }

  async getClientGoal(userId: string): Promise<ClientGoalResponse | null> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: { goalRef: true },
    });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    if (!client.goalRef) {
      return null;
    }

    return {
      id: client.goalRef.id,
      name: client.goalRef.name,
      description: client.goalRef.description,
    };
  }

  async setClientGoal(
    userId: string,
    goalId: string,
  ): Promise<ClientGoalResponse> {
    const client = await this.prisma.client.findUnique({ where: { userId } });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });

    if (!goal || !goal.isActive) {
      throw new NotFoundException('Active goal not found');
    }

    await this.prisma.client.update({
      where: { id: client.id },
      data: { goalId: goal.id, goal: goal.name },
    });

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
    };
  }

  private rethrowUniqueName(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Goal name already exists');
    }
  }
}
