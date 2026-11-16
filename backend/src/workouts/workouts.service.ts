import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  WorkoutStatus,
} from '@prisma/client';
import {
  PaginatedResponse,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  dateStringInTimezone,
  minutesOfDayInTimezone,
  parseStartTime,
} from '../common/timezone';
import { ClientWorkoutsQueryDto } from './dto/client-workouts-query.dto';
import { TrainerWorkoutsQueryDto } from './dto/trainer-workouts-query.dto';
import { CreateAdminWorkoutTemplateDto } from './dto/create-admin-workout-template.dto';
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateAdminWorkoutTemplateDto } from './dto/update-admin-workout-template.dto';
import { UpdateWorkoutItemResultDto } from './dto/update-workout-item-result.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import { WorkoutTemplateItemDto } from './dto/workout-item.dto';

const workoutItemInclude = {
  exercise: true,
  equipment: true,
  result: true,
} satisfies Prisma.WorkoutItemInclude;

const workoutInclude = {
  client: { include: { user: true } },
  gym: true,
  items: {
    include: workoutItemInclude,
    orderBy: { order: 'asc' },
  },
} satisfies Prisma.WorkoutInclude;

const templateInclude = {
  items: { orderBy: { order: 'asc' } },
  gym: { select: { name: true } },
} satisfies Prisma.WorkoutTemplateInclude;

type WorkoutEntity = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;
type TemplateEntity = Prisma.WorkoutTemplateGetPayload<{
  include: typeof templateInclude;
}>;

const AUTO_FINISH_MS = 2 * 60 * 60 * 1000;
const AUTO_FINISH_CHECK_INTERVAL_MS = 60 * 1000;

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
  clientName: string;
  trainerId: string;
  gymId: string;
  gymName: string;
  date: string;
  startTime: string | null;
  status: WorkoutStatus;
  startedAt: string | null;
  autoFinishAt: string | null;
  comment: string | null;
  templateId: string | null;
  items: WorkoutItemResponse[];
}

export type WorkoutTemplateScope = 'GLOBAL' | 'GYM' | 'PERSONAL';

export interface WorkoutTemplateResponse {
  id: string;
  trainerId: string | null;
  gymId: string | null;
  gymName: string | null;
  createdById: string | null;
  scope: WorkoutTemplateScope;
  name: string;
  description: string | null;
  isActive: boolean;
  archivedAt: Date | null;
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
export class WorkoutsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkoutsService.name);
  private autoFinishTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.autoFinishTimer = setInterval(() => {
      void this.runAutomation().catch((error) => {
        this.logger.error(
          'Failed to run workout automation',
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, AUTO_FINISH_CHECK_INTERVAL_MS);
    this.autoFinishTimer.unref?.();

    void this.runAutomation().catch((error) => {
      this.logger.error(
        'Failed to run workout automation on startup',
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  private async runAutomation(): Promise<void> {
    await this.closeExpiredWorkouts();
    await this.closeMissedWorkouts();
    await this.sendWorkoutReminders();
  }

  onModuleDestroy(): void {
    if (this.autoFinishTimer) {
      clearInterval(this.autoFinishTimer);
      this.autoFinishTimer = undefined;
    }
  }

  async closeExpiredWorkouts(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - AUTO_FINISH_MS);
    const expired = await this.prisma.workout.findMany({
      where: {
        status: WorkoutStatus.IN_PROGRESS,
        startedAt: { not: null, lte: cutoff },
      },
      select: {
        id: true,
        gymId: true,
        date: true,
        client: { select: { userId: true } },
        trainer: { select: { userId: true } },
      },
    });

    if (expired.length === 0) {
      return 0;
    }

    const updated = await this.prisma.workout.updateMany({
      where: { id: { in: expired.map((workout) => workout.id) } },
      data: { status: WorkoutStatus.AUTO_CLOSED },
    });

    for (const workout of expired) {
      void this.notificationsService.createEvent({
        recipientIds: [workout.client.userId, workout.trainer.userId],
        senderId: workout.trainer.userId,
        type: NotificationType.WORKOUT,
        entityId: workout.id,
        gymId: workout.gymId,
        title: 'Тренировка закрыта автоматически',
        body: `Тренировка ${workout.date.toISOString().slice(0, 10)} закрыта: прошло 2 часа. Факт равен плану.`,
      });
    }

    return updated.count;
  }

  async closeMissedWorkouts(now: Date = new Date()): Promise<number> {
    const planned = await this.prisma.workout.findMany({
      where: { status: WorkoutStatus.PLANNED },
      select: {
        id: true,
        gymId: true,
        date: true,
        client: { select: { userId: true, user: { select: { timezone: true } } } },
      },
    });

    const missed = planned.filter(
      (workout) =>
        workout.date.toISOString().slice(0, 10) <
        dateStringInTimezone(now, workout.client.user.timezone),
    );

    if (missed.length === 0) {
      return 0;
    }

    const updated = await this.prisma.workout.updateMany({
      where: { id: { in: missed.map((workout) => workout.id) } },
      data: { status: WorkoutStatus.MISSED },
    });

    for (const workout of missed) {
      void this.notificationsService.createEvent({
        recipientIds: [workout.client.userId],
        senderId: workout.client.userId,
        type: NotificationType.WORKOUT,
        entityId: workout.id,
        gymId: workout.gymId,
        title: 'Тренировка пропущена',
        body: `Тренировка ${workout.date.toISOString().slice(0, 10)} не была начата и отмечена как пропущенная.`,
      });
    }

    return updated.count;
  }

  async sendWorkoutReminders(now: Date = new Date()): Promise<number> {
    const planned = await this.prisma.workout.findMany({
      where: {
        status: WorkoutStatus.PLANNED,
        startTime: { not: null },
        reminderSentAt: null,
      },
      select: {
        id: true,
        gymId: true,
        date: true,
        startTime: true,
        client: {
          select: { userId: true, user: { select: { timezone: true } } },
        },
      },
    });

    let sent = 0;

    for (const workout of planned) {
      if (!workout.startTime) {
        continue;
      }

      const timezone = workout.client.user.timezone;
      const today = dateStringInTimezone(now, timezone);

      if (workout.date.toISOString().slice(0, 10) !== today) {
        continue;
      }

      const nowMinutes = minutesOfDayInTimezone(now, timezone);
      const startMinutes = parseStartTime(workout.startTime);
      const minutesLeft = startMinutes - nowMinutes;

      if (minutesLeft <= 0 || minutesLeft > 60) {
        continue;
      }

      const updated = await this.prisma.workout.updateMany({
        where: { id: workout.id, reminderSentAt: null },
        data: { reminderSentAt: now },
      });

      if (updated.count === 0) {
        continue;
      }

      sent += 1;
      void this.notificationsService.createEvent({
        recipientIds: [workout.client.userId],
        senderId: workout.client.userId,
        type: NotificationType.WORKOUT,
        entityId: workout.id,
        gymId: workout.gymId,
        title: 'Напоминание о тренировке',
        body: `Тренировка начнётся через ${minutesLeft} мин (${workout.startTime}).`,
      });
    }

    return sent;
  }

  async findTemplates(
    userId: string,
    search?: string,
  ): Promise<WorkoutTemplateResponse[]> {
    const trainer = await this.getTrainer(userId);
    const gymIds = await this.activeGymIds(trainer.id);

    const templates = await this.prisma.workoutTemplate.findMany({
      where: {
        ...this.trainerTemplateWhere(trainer.id, gymIds),
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
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
    const gymIds = await this.activeGymIds(trainer.id);

    return this.toTemplateResponse(
      await this.findAccessibleTemplateEntity(trainer.id, gymIds, id),
    );
  }

  async createTemplate(
    userId: string,
    dto: CreateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const trainer = await this.getTrainer(userId);
    await this.assertItems(dto.items, undefined, trainer.id);

    const personalCount = await this.prisma.workoutTemplate.count({
      where: { trainerId: trainer.id, isActive: true },
    });

    if (personalCount >= 10) {
      throw new ConflictException(
        'Достигнут лимит 10 личных шаблонов. Удалите шаблон в архив.',
      );
    }

    const template = await this.prisma.workoutTemplate.create({
      data: {
        trainerId: trainer.id,
        createdById: userId,
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
    await this.findOwnTemplateEntity(trainer.id, id);

    if (dto.items) {
      await this.assertItems(dto.items, undefined, trainer.id);
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

    return this.findOneTemplateResponse(id);
  }

  async removeTemplate(userId: string, id: string): Promise<void> {
    const trainer = await this.getTrainer(userId);
    await this.findOwnTemplateEntity(trainer.id, id);

    await this.prisma.workoutTemplate.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  async findAdminTemplates(): Promise<WorkoutTemplateResponse[]> {
    const templates = await this.prisma.workoutTemplate.findMany({
      where: { isActive: true, trainerId: null },
      include: templateInclude,
      orderBy: [{ gymId: 'asc' }, { createdAt: 'asc' }],
    });

    return templates.map((template) => this.toTemplateResponse(template));
  }

  async createAdminTemplate(
    userId: string,
    dto: CreateAdminWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    if (dto.gym_id) {
      await this.assertGym(dto.gym_id);
    }
    await this.assertItems(dto.items, dto.gym_id ?? undefined);

    const template = await this.prisma.workoutTemplate.create({
      data: {
        gymId: dto.gym_id ?? null,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        items: { create: dto.items.map((item) => itemData(item)) },
      },
      include: templateInclude,
    });

    return this.toTemplateResponse(template);
  }

  async updateAdminTemplate(
    userId: string,
    id: string,
    dto: UpdateAdminWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const template = await this.findAdminTemplateEntity(id);

    if (dto.gym_id) {
      await this.assertGym(dto.gym_id);
    }
    if (dto.items) {
      await this.assertItems(
        dto.items,
        dto.gym_id ?? template.gymId ?? undefined,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workoutTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          gymId: dto.gym_id === undefined ? undefined : dto.gym_id,
        },
      });

      if (dto.items) {
        await tx.workoutTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.workoutTemplateItem.createMany({
          data: dto.items.map((item) => ({ ...itemData(item), templateId: id })),
        });
      }
    });

    return this.findOneTemplateResponse(id);
  }

  async removeAdminTemplate(id: string): Promise<void> {
    await this.findAdminTemplateEntity(id);

    await this.prisma.workoutTemplate.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  async findReceptionTemplates(
    userId: string,
  ): Promise<WorkoutTemplateResponse[]> {
    const reception = await this.getReception(userId);
    const templates = await this.prisma.workoutTemplate.findMany({
      where: {
        trainerId: null,
        gymId: reception.gymId,
        isActive: true,
      },
      include: templateInclude,
      orderBy: { createdAt: 'asc' },
    });

    return templates.map((template) => this.toTemplateResponse(template));
  }

  async createReceptionTemplate(
    userId: string,
    dto: CreateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const reception = await this.getReception(userId);
    await this.assertItems(dto.items, reception.gymId);

    const template = await this.prisma.workoutTemplate.create({
      data: {
        gymId: reception.gymId,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        items: { create: dto.items.map((item) => itemData(item)) },
      },
      include: templateInclude,
    });

    return this.toTemplateResponse(template);
  }

  async updateReceptionTemplate(
    userId: string,
    id: string,
    dto: UpdateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    const reception = await this.getReception(userId);
    await this.findReceptionTemplateEntity(reception.gymId, id);

    if (dto.items) {
      await this.assertItems(dto.items, reception.gymId);
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

    return this.findOneTemplateResponse(id);
  }

  async removeReceptionTemplate(userId: string, id: string): Promise<void> {
    const reception = await this.getReception(userId);
    await this.findReceptionTemplateEntity(reception.gymId, id);

    await this.prisma.workoutTemplate.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  async createWorkout(
    userId: string,
    dto: CreateWorkoutDto,
  ): Promise<WorkoutResponse> {
    const trainer = await this.getTrainer(userId);
    await this.assertActiveLink(trainer.id, dto.client_id, dto.gym_id);
    await this.assertGym(dto.gym_id);
    await this.assertItems(dto.items, dto.gym_id);
    const clientUserId = await this.assertAssignableDate(
      dto.date,
      dto.client_id,
    );

    if (dto.template_id) {
      await this.assertTemplateAccessible(trainer.id, dto.template_id);
    }

    const workout = await this.prisma.workout.create({
      data: {
        clientId: dto.client_id,
        trainerId: trainer.id,
        gymId: dto.gym_id,
        date: parseDate(dto.date),
        startTime: dto.start_time ?? null,
        status: WorkoutStatus.PLANNED,
        comment: dto.comment,
        templateId: dto.template_id,
        items: { create: dto.items.map((item) => itemData(item)) },
      },
      include: workoutInclude,
    });

    void this.notificationsService.createEvent({
      recipientIds: [clientUserId],
      senderId: trainer.userId,
      type: NotificationType.WORKOUT,
      entityId: workout.id,
      gymId: dto.gym_id,
      title: 'Назначена тренировка',
      body: `Тренировка на ${dto.date}${dto.start_time ? ` в ${dto.start_time}` : ''}.`,
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
      select: {
        id: true,
        trainerId: true,
        status: true,
        trainer: { select: { userId: true } },
      },
    });

    if (!workout || workout.trainer.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.status !== WorkoutStatus.PLANNED) {
      throw new ConflictException(
        'План тренировки можно изменять только до её начала',
      );
    }

    await this.assertActiveLink(trainer.id, dto.client_id, dto.gym_id);
    await this.assertGym(dto.gym_id);
    await this.assertItems(dto.items, dto.gym_id);
    await this.assertAssignableDate(dto.date, dto.client_id);

    if (dto.template_id) {
      await this.assertTemplateAccessible(trainer.id, dto.template_id);
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
          startTime: dto.start_time ?? null,
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

  async trainerWorkouts(
    userId: string,
    query: TrainerWorkoutsQueryDto,
  ): Promise<PaginatedResponse<WorkoutResponse>> {
    const trainer = await this.getTrainer(userId);
    const where: Prisma.WorkoutWhereInput = { trainerId: trainer.id };

    if (query.client_id) {
      where.clientId = query.client_id;
    }
    if (query.gym_id) {
      where.gymId = query.gym_id;
    }
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: parseDate(query.from) } : {}),
        ...(query.to ? { lte: parseDate(query.to) } : {}),
      };
    }

    const [workouts, total] = await this.prisma.$transaction([
      this.prisma.workout.findMany({
        where,
        include: workoutInclude,
        orderBy: { date: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.workout.count({ where }),
    ]);

    return {
      items: workouts.map((workout) => this.toWorkoutResponse(workout)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async trainerWorkout(userId: string, id: string): Promise<WorkoutResponse> {
    const trainer = await this.getTrainer(userId);
    const workout = await this.prisma.workout.findFirst({
      where: { id, trainerId: trainer.id },
      include: workoutInclude,
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return this.toWorkoutResponse(workout);
  }

  async clientWorkouts(
    userId: string,
    query: ClientWorkoutsQueryDto,
  ): Promise<PaginatedResponse<WorkoutResponse>> {
    const client = await this.getClient(userId);
    const from = parseDate(query.from);
    const to = parseDate(query.to);

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be less than or equal to to');
    }

    const where: Prisma.WorkoutWhereInput = {
      clientId: client.id,
      date: { gte: from, lte: to },
      ...(query.gym_id ? { gymId: query.gym_id } : {}),
    };

    const [workouts, total] = await this.prisma.$transaction([
      this.prisma.workout.findMany({
        where,
        include: workoutInclude,
        orderBy: { date: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.workout.count({ where }),
    ]);

    return {
      items: workouts.map((workout) => this.toWorkoutResponse(workout)),
      total,
      page: query.page,
      limit: query.limit,
    };
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

  async startWorkout(userId: string, id: string): Promise<WorkoutResponse> {
    const client = await this.getClient(userId);
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        date: true,
        status: true,
        client: { select: { user: { select: { timezone: true } } } },
      },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.clientId !== client.id) {
      throw new ForbiddenException('Workout belongs to another client');
    }

    if (workout.status !== WorkoutStatus.PLANNED) {
      throw new ConflictException(
        workout.status === WorkoutStatus.IN_PROGRESS
          ? 'Тренировка уже начата'
          : 'Завершённую тренировку нельзя начать',
      );
    }

    const today = dateStringInTimezone(
      new Date(),
      workout.client.user.timezone,
    );

    if (workout.date.toISOString().slice(0, 10) < today) {
      throw new ConflictException('Пропущенную тренировку начать нельзя');
    }

    const updated = await this.prisma.workout.updateMany({
      where: {
        id,
        clientId: client.id,
        status: WorkoutStatus.PLANNED,
      },
      data: { status: WorkoutStatus.IN_PROGRESS, startedAt: new Date() },
    });

    if (updated.count === 0) {
      throw new ConflictException('Тренировка уже начата');
    }

    return this.findOneWorkoutResponse(id);
  }

  async finishWorkout(userId: string, id: string): Promise<WorkoutResponse> {
    const client = await this.getClient(userId);
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      select: { id: true, clientId: true, status: true },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.clientId !== client.id) {
      throw new ForbiddenException('Workout belongs to another client');
    }

    if (workout.status !== WorkoutStatus.IN_PROGRESS) {
      throw new ConflictException(
        workout.status === WorkoutStatus.PLANNED
          ? 'Сначала начните тренировку'
          : 'Тренировка уже завершена',
      );
    }

    const updated = await this.prisma.workout.updateMany({
      where: {
        id,
        clientId: client.id,
        status: WorkoutStatus.IN_PROGRESS,
      },
      data: { status: WorkoutStatus.COMPLETED },
    });

    if (updated.count === 0) {
      throw new ConflictException('Тренировка уже завершена');
    }

    return this.findOneWorkoutResponse(id);
  }

  async trainerStartWorkout(
    userId: string,
    id: string,
  ): Promise<WorkoutResponse> {
    void userId;
    void id;
    throw new ForbiddenException('Тренировку начинает клиент');
  }

  async trainerFinishWorkout(
    userId: string,
    id: string,
  ): Promise<WorkoutResponse> {
    const trainer = await this.getTrainer(userId);
    const workout = await this.findTrainerWorkoutForTransition(trainer.id, id);
    await this.assertActiveLink(trainer.id, workout.clientId, workout.gymId);

    if (workout.status !== WorkoutStatus.IN_PROGRESS) {
      throw new ConflictException(
        workout.status === WorkoutStatus.PLANNED
          ? 'Сначала начните тренировку'
          : 'Тренировка уже завершена',
      );
    }

    await this.transitionWorkout(
      { id, trainerId: trainer.id },
      WorkoutStatus.IN_PROGRESS,
      WorkoutStatus.COMPLETED,
      'Тренировка уже завершена',
    );

    const completed = await this.prisma.workout.findUnique({
      where: { id },
      select: {
        gymId: true,
        date: true,
        client: { select: { userId: true } },
        trainer: { select: { userId: true } },
      },
    });

    if (completed) {
      void this.notificationsService.createEvent({
        recipientIds: [completed.client.userId],
        senderId: completed.trainer.userId,
        type: NotificationType.WORKOUT,
        entityId: id,
        gymId: completed.gymId,
        title: 'Тренировка завершена тренером',
        body: `Тренер завершил тренировку ${completed.date.toISOString().slice(0, 10)}. Факт зафиксирован.`,
      });
    }

    return this.findOneWorkoutResponse(id);
  }

  async updateItemResult(
    userId: string,
    itemId: string,
    dto: UpdateWorkoutItemResultDto,
  ) {
    const client = await this.getClient(userId);
    const item = await this.prisma.workoutItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        workout: { select: { clientId: true, status: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Workout item not found');
    }

    if (item.workout.clientId !== client.id) {
      throw new ForbiddenException('Workout item belongs to another client');
    }

    this.assertResultEditable(item.workout.status);

    return this.upsertItemResult(itemId, dto);
  }

  async updateTrainerItemResult(
    userId: string,
    itemId: string,
    dto: UpdateWorkoutItemResultDto,
  ) {
    const trainer = await this.getTrainer(userId);
    const item = await this.prisma.workoutItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        workout: {
          select: { trainerId: true, clientId: true, gymId: true, status: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Workout item not found');
    }

    if (item.workout.trainerId !== trainer.id) {
      throw new ForbiddenException('Workout item belongs to another trainer');
    }

    await this.assertActiveLink(trainer.id, item.workout.clientId, item.workout.gymId);
    this.assertResultEditable(item.workout.status);

    return this.upsertItemResult(itemId, dto);
  }

  private async findTrainerWorkoutForTransition(trainerId: string, id: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      select: {
        id: true,
        trainerId: true,
        clientId: true,
        gymId: true,
        status: true,
      },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.trainerId !== trainerId) {
      throw new ForbiddenException('Workout belongs to another trainer');
    }

    return workout;
  }

  private async transitionWorkout(
    where: Prisma.WorkoutWhereInput,
    expected: WorkoutStatus,
    next: WorkoutStatus,
    conflictMessage: string,
    data: Prisma.WorkoutUpdateManyMutationInput = {},
  ): Promise<void> {
    const updated = await this.prisma.workout.updateMany({
      where: { ...where, status: expected },
      data: { ...data, status: next },
    });

    if (updated.count === 0) {
      throw new ConflictException(conflictMessage);
    }
  }

  private assertResultEditable(status: WorkoutStatus): void {
    if (status === WorkoutStatus.PLANNED) {
      throw new ConflictException('Сначала начните тренировку');
    }

    if (
      status === WorkoutStatus.COMPLETED ||
      status === WorkoutStatus.AUTO_CLOSED ||
      status === WorkoutStatus.MISSED
    ) {
      throw new ConflictException(
        'Результаты завершённой тренировки изменять нельзя',
      );
    }
  }

  private async assertAssignableDate(
    date: string,
    clientId: string,
  ): Promise<string> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, user: { select: { timezone: true } } },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const today = dateStringInTimezone(new Date(), client.user.timezone);

    if (date < today) {
      throw new BadRequestException(
        'Нельзя назначить тренировку на прошедшую дату',
      );
    }

    return client.userId;
  }

  private upsertItemResult(
    itemId: string,
    dto: UpdateWorkoutItemResultDto,
  ) {
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

  private async getReception(userId: string) {
    const reception = await this.prisma.reception.findUnique({
      where: { userId },
      select: { gymId: true },
    });

    if (!reception) {
      throw new ForbiddenException('Reception profile not found');
    }

    return reception;
  }

  private async activeGymIds(trainerId: string): Promise<string[]> {
    const links = await this.prisma.trainerGym.findMany({
      where: { trainerId, isActive: true },
      select: { gymId: true },
    });

    return links.map((link) => link.gymId);
  }

  private trainerTemplateWhere(
    trainerId: string,
    gymIds: string[],
  ): Prisma.WorkoutTemplateWhereInput {
    return {
      isActive: true,
      OR: [
        { trainerId },
        { trainerId: null, gymId: null },
        { trainerId: null, gymId: { in: gymIds } },
      ],
    };
  }

  private async findAccessibleTemplateEntity(
    trainerId: string,
    gymIds: string[],
    id: string,
  ) {
    return this.findTemplateOrThrow({
      ...this.trainerTemplateWhere(trainerId, gymIds),
      id,
    });
  }

  private async findOwnTemplateEntity(trainerId: string, id: string) {
    return this.findTemplateOrThrow({ id, trainerId, isActive: true });
  }

  private async findActiveTemplateEntity(id: string) {
    return this.findTemplateOrThrow({ id, isActive: true });
  }

  private async findAdminTemplateEntity(id: string) {
    return this.findTemplateOrThrow({ id, trainerId: null, isActive: true });
  }

  private async findReceptionTemplateEntity(gymId: string, id: string) {
    return this.findTemplateOrThrow({
      id,
      gymId,
      trainerId: null,
      isActive: true,
    });
  }

  private async findTemplateOrThrow(
    where: Prisma.WorkoutTemplateWhereInput,
  ) {
    const template = await this.prisma.workoutTemplate.findFirst({
      where,
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
    gymId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const link = await this.prisma.clientTrainer.findFirst({
      where: { clientId, trainerId, gymId, isActive: true },
    });

    if (!link) {
      throw new ForbiddenException('Trainer not linked to client in this gym');
    }

    const trainerGym = await this.prisma.trainerGym.findFirst({
      where: { trainerId, gymId, isActive: true },
    });

    if (!trainerGym) {
      throw new ForbiddenException('Trainer is not active in this gym');
    }
  }

  private async assertGym(gymId: string): Promise<void> {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
  }

  private async assertTemplateAccessible(
    trainerId: string,
    templateId: string,
  ): Promise<void> {
    const gymIds = await this.activeGymIds(trainerId);
    const template = await this.prisma.workoutTemplate.findFirst({
      where: {
        ...this.trainerTemplateWhere(trainerId, gymIds),
        id: templateId,
      },
    });

    if (!template) {
      throw new NotFoundException('Workout template not found');
    }
  }

  private async assertItems(
    items: WorkoutTemplateItemDto[],
    gymId?: string,
    trainerId?: string,
  ): Promise<void> {
    const exerciseIds = [...new Set(items.map((item) => item.exerciseId))];
    const exercisesCount = await this.prisma.exercise.count({
      where: { id: { in: exerciseIds }, isActive: true },
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

    let allowedGymIds: string[] | undefined;
    if (!gymId && trainerId) {
      const trainerGyms = await this.prisma.trainerGym.findMany({
        where: { trainerId, isActive: true },
        select: { gymId: true },
      });

      if (trainerGyms.length > 0) {
        allowedGymIds = trainerGyms.map((link) => link.gymId);
      }
    }

    const equipmentCount = await this.prisma.gymEquipment.count({
      where: {
        id: { in: equipmentIds },
        ...(gymId ? { gymId } : {}),
        ...(allowedGymIds ? { gymId: { in: allowedGymIds } } : {}),
      },
    });

    if (equipmentCount !== equipmentIds.length) {
      throw new BadRequestException('Equipment not found');
    }
  }

  private async findOneTemplateResponse(
    id: string,
  ): Promise<WorkoutTemplateResponse> {
    return this.toTemplateResponse(await this.findActiveTemplateEntity(id));
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
      gymId: template.gymId,
      gymName: template.gym?.name ?? null,
      createdById: template.createdById,
      scope: template.trainerId
        ? 'PERSONAL'
        : template.gymId
          ? 'GYM'
          : 'GLOBAL',
      name: template.name,
      description: template.description,
      isActive: template.isActive,
      archivedAt: template.archivedAt,
      items: template.items,
    };
  }

  private toWorkoutResponse(workout: WorkoutEntity): WorkoutResponse {
    return {
      id: workout.id,
      clientId: workout.clientId,
      clientName: workout.client.user.name,
      trainerId: workout.trainerId,
      gymId: workout.gymId,
      gymName: workout.gym.name,
      date: workout.date.toISOString().slice(0, 10),
      startTime: workout.startTime,
      status: workout.status,
      startedAt: workout.startedAt?.toISOString() ?? null,
      autoFinishAt: workout.startedAt
        ? new Date(workout.startedAt.getTime() + AUTO_FINISH_MS).toISOString()
        : null,
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
