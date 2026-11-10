import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WorkoutStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientWorkoutsQueryDto } from './dto/client-workouts-query.dto';
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutItemResultDto } from './dto/update-workout-item-result.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import { WorkoutTemplateItemDto } from './dto/workout-item.dto';

const workoutItemInclude = {
  exercise: true,
  equipment: true,
  result: true,
} satisfies Prisma.WorkoutItemInclude;

const workoutInclude = {
  items: {
    include: workoutItemInclude,
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.WorkoutInclude;

const templateInclude = {
  items: { orderBy: { order: 'asc' } },
} satisfies Prisma.WorkoutTemplateInclude;

type WorkoutEntity = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;
type TemplateEntity = Prisma.WorkoutTemplateGetPayload<{
  include: typeof templateInclude;
}>;

export interface WorkoutItemResponse {
  id: string;
  exercise: unknown;
  gymEquipment: unknown;
  plannedWeight: number | null;
  plannedSets: number;
  plannedReps: number;
  order: number;
  result: unknown;
}

export interface WorkoutResponse {
  id: string;
  clientId: string;
  trainerId: string;
  gymId: string;
  date: string;
  status: WorkoutStatus;
  comment: string | null;
  templateId: string | null;
  items: WorkoutItemResponse[];
}

export interface WorkoutTemplateResponse {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  items: unknown[];
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function itemData(item: WorkoutTemplateItemDto) {
  return {
    exerciseId: item.exerciseId,
    equipmentId: item.equipmentId,
    plannedWeight: item.plannedWeight,
    plannedSets: item.plannedSets,
    plannedReps: item.plannedReps,
    order: item.order,
  };
}

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findTemplates(userId: string): Promise<WorkoutTemplateResponse[]> {
    const trainer = await this.getTrainer(userId);

    const templates = await this.prisma.workoutTemplate.findMany({
      where: { trainerId: trainer.id },
      include: templateInclude,
      orderBy: { createdAt: 'asc' },
    });

    return templates.map((template) => this.toTemplateResponse(template));
  }

  async findTemplate(
    userId: string,
    id: string,
  ): Promise<WorkoutTemplateResponse> {
    const trainer = await this.getTrainer(userId);

    return this.toTemplateResponse(
      await this.findTemplateEntity(trainer.id, id),
    );
  }

  async createTemplate(
    userId: string,
    dto: CreateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const trainer = await this.getTrainer(userId);
    await this.assertItems(dto.items);

    const template = await this.prisma.workoutTemplate.create({
      data: {
        trainerId: trainer.id,
        name: dto.name,
        description: dto.description,
        items: { create: dto.items.map((item) => itemData(item)) },
      },
      include: templateInclude,
    });

    return this.toTemplateResponse(template);
  }

  async updateTemplate(
    userId: string,
    id: string,
    dto: UpdateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const trainer = await this.getTrainer(userId);
    await this.findTemplateEntity(trainer.id, id);

    if (dto.items) {
      await this.assertItems(dto.items);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutTemplate.update({
        where: { id },
        data: { name: dto.name, description: dto.description },
      });

      if (dto.items) {
        await tx.workoutTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.workoutTemplateItem.createMany({
          data: dto.items.map((item) => ({ ...itemData(item), templateId: id })),
        });
      }
    });

    return this.findOneTemplateResponse(trainer.id, id);
  }

  async removeTemplate(userId: string, id: string): Promise<void> {
    const trainer = await this.getTrainer(userId);
    await this.findTemplateEntity(trainer.id, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.workout.updateMany({
        where: { templateId: id },
        data: { templateId: null },
      });
      await tx.workoutTemplateItem.deleteMany({ where: { templateId: id } });
      await tx.workoutTemplate.delete({ where: { id } });
    });
  }

  async createWorkout(
    userId: string,
    dto: CreateWorkoutDto,
  ): Promise<WorkoutResponse> {
    const trainer = await this.getTrainer(userId);
    await this.assertActiveLink(trainer.id, dto.client_id);
    await this.assertGym(dto.gym_id);
    await this.assertItems(dto.items);

    if (dto.template_id) {
      await this.assertTemplateOwned(trainer.id, dto.template_id);
    }

    const workout = await this.prisma.workout.create({
      data: {
        clientId: dto.client_id,
        trainerId: trainer.id,
        gymId: dto.gym_id,
        date: parseDate(dto.date),
        status: WorkoutStatus.PLANNED,
        comment: dto.comment,
        templateId: dto.template_id,
        items: { create: dto.items.map((item) => itemData(item)) },
      },
      include: workoutInclude,
    });

    return this.toWorkoutResponse(workout);
  }

  async updateWorkout(
    userId: string,
    id: string,
    dto: CreateWorkoutDto,
  ): Promise<WorkoutResponse> {
    const trainer = await this.getTrainer(userId);
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      select: { id: true, trainerId: true, trainer: { select: { userId: true } } },
    });

    if (!workout || workout.trainer.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    await this.assertActiveLink(trainer.id, dto.client_id);
    await this.assertGym(dto.gym_id);
    await this.assertItems(dto.items);

    if (dto.template_id) {
      await this.assertTemplateOwned(trainer.id, dto.template_id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutItemResult.deleteMany({
        where: { item: { workoutId: id } },
      });
      await tx.workoutItem.deleteMany({ where: { workoutId: id } });
      await tx.workout.update({
        where: { id },
        data: {
          clientId: dto.client_id,
          gymId: dto.gym_id,
          date: parseDate(dto.date),
          comment: dto.comment,
          templateId: dto.template_id ?? null,
        },
      });
      await tx.workoutItem.createMany({
        data: dto.items.map((item) => ({ ...itemData(item), workoutId: id })),
      });
    });

    return this.findOneWorkoutResponse(id);
  }

  async clientWorkouts(
    userId: string,
    query: ClientWorkoutsQueryDto,
  ): Promise<WorkoutResponse[]> {
    const client = await this.getClient(userId);
    const from = parseDate(query.from);
    const to = parseDate(query.to);

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be less than or equal to to');
    }

    const workouts = await this.prisma.workout.findMany({
      where: { clientId: client.id, date: { gte: from, lte: to } },
      include: workoutInclude,
      orderBy: { date: 'asc' },
    });

    return workouts.map((workout) => this.toWorkoutResponse(workout));
  }

  async clientWorkout(userId: string, id: string): Promise<WorkoutResponse> {
    const client = await this.getClient(userId);
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: workoutInclude,
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.clientId !== client.id) {
      throw new ForbiddenException('Workout belongs to another client');
    }

    return this.toWorkoutResponse(workout);
  }

  async updateItemResult(
    userId: string,
    itemId: string,
    dto: UpdateWorkoutItemResultDto,
  ) {
    const client = await this.getClient(userId);
    const item = await this.prisma.workoutItem.findUnique({
      where: { id: itemId },
      select: { id: true, workout: { select: { clientId: true } } },
    });

    if (!item || item.workout.clientId !== client.id) {
      throw new NotFoundException('Workout item not found');
    }

    return this.prisma.workoutItemResult.upsert({
      where: { itemId },
      create: {
        itemId,
        done: dto.done,
        actualWeight: dto.actualWeight ?? null,
        actualReps: dto.actualReps ?? null,
        clientComment: dto.clientComment ?? null,
      },
      update: {
        done: dto.done,
        actualWeight: dto.actualWeight ?? null,
        actualReps: dto.actualReps ?? null,
        clientComment: dto.clientComment ?? null,
      },
    });
  }

  private async getTrainer(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });

    if (!trainer) {
      throw new ForbiddenException('Trainer profile not found');
    }

    return trainer;
  }

  private async getClient(userId: string) {
    const client = await this.prisma.client.findUnique({ where: { userId } });

    if (!client) {
      throw new ForbiddenException('Client profile not found');
    }

    return client;
  }

  private async findTemplateEntity(trainerId: string, id: string) {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { id, trainerId },
      include: templateInclude,
    });

    if (!template) {
      throw new NotFoundException('Workout template not found');
    }

    return template;
  }

  private async assertActiveLink(
    trainerId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const link = await this.prisma.clientTrainer.findFirst({
      where: { clientId, trainerId, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Trainer not linked to client');
    }
  }

  private async assertGym(gymId: string): Promise<void> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
  }

  private async assertTemplateOwned(
    trainerId: string,
    templateId: string,
  ): Promise<void> {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { id: templateId, trainerId },
    });

    if (!template) {
      throw new NotFoundException('Workout template not found');
    }
  }

  private async assertItems(items: WorkoutTemplateItemDto[]): Promise<void> {
    const exerciseIds = [...new Set(items.map((item) => item.exerciseId))];
    const exercisesCount = await this.prisma.exercise.count({
      where: { id: { in: exerciseIds } },
    });

    if (exercisesCount !== exerciseIds.length) {
      throw new BadRequestException('Exercise not found');
    }

    const equipmentIds = [
      ...new Set(
        items
          .map((item) => item.equipmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (equipmentIds.length === 0) {
      return;
    }

    const equipmentCount = await this.prisma.gymEquipment.count({
      where: { id: { in: equipmentIds } },
    });

    if (equipmentCount !== equipmentIds.length) {
      throw new BadRequestException('Equipment not found');
    }
  }

  private async findOneTemplateResponse(
    trainerId: string,
    id: string,
  ): Promise<WorkoutTemplateResponse> {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { id, trainerId },
      include: templateInclude,
    });

    if (!template) {
      throw new NotFoundException('Workout template not found');
    }

    return this.toTemplateResponse(template);
  }

  private async findOneWorkoutResponse(id: string): Promise<WorkoutResponse> {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: workoutInclude,
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return this.toWorkoutResponse(workout);
  }

  private toTemplateResponse(
    template: TemplateEntity,
  ): WorkoutTemplateResponse {
    return {
      id: template.id,
      trainerId: template.trainerId,
      name: template.name,
      description: template.description,
      items: template.items,
    };
  }

  private toWorkoutResponse(workout: WorkoutEntity): WorkoutResponse {
    return {
      id: workout.id,
      clientId: workout.clientId,
      trainerId: workout.trainerId,
      gymId: workout.gymId,
      date: workout.date.toISOString().slice(0, 10),
      status: workout.status,
      comment: workout.comment,
      templateId: workout.templateId,
      items: workout.items.map((item) => ({
        id: item.id,
        exercise: item.exercise,
        gymEquipment: item.equipment,
        plannedWeight: item.plannedWeight,
        plannedSets: item.plannedSets,
        plannedReps: item.plannedReps,
        order: item.order,
        result: item.result,
      })),
    };
  }
}
