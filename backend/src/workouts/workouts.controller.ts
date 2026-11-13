import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, WorkoutItemResult } from '@prisma/client';
import { PaginatedResponse } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientWorkoutsQueryDto } from './dto/client-workouts-query.dto';
import { CreateAdminWorkoutTemplateDto } from './dto/create-admin-workout-template.dto';
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { TrainerWorkoutsQueryDto } from './dto/trainer-workouts-query.dto';
import { UpdateAdminWorkoutTemplateDto } from './dto/update-admin-workout-template.dto';
import { UpdateWorkoutItemResultDto } from './dto/update-workout-item-result.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import {
  WorkoutResponse,
  WorkoutTemplateResponse,
  WorkoutsService,
} from './workouts.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/templates')
export class AdminTemplatesController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Глобальные шаблоны и шаблоны залов' })
  findAll(): Promise<WorkoutTemplateResponse[]> {
    return this.workoutsService.findAdminTemplates();
  }

  @Post()
  @ApiOperation({ summary: 'Создать глобальный шаблон или шаблон зала' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAdminWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.createAdminTemplate(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить шаблон' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.updateAdminTemplate(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать шаблон' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.workoutsService.removeAdminTemplate(id);
  }
}

@ApiTags('reception')
@ApiBearerAuth()
@Roles(Role.RECEPTION)
@Controller('reception/templates')
export class ReceptionTemplatesController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Шаблоны моего зала' })
  findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<WorkoutTemplateResponse[]> {
    return this.workoutsService.findReceptionTemplates(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать шаблон тренировки для своего зала' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.createReceptionTemplate(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить шаблон своего зала' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.updateReceptionTemplate(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать шаблон своего зала' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.workoutsService.removeReceptionTemplate(userId, id);
  }
}

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/templates')
export class TrainerTemplatesController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Шаблоны тренировок тренера' })
  findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<WorkoutTemplateResponse[]> {
    return this.workoutsService.findTemplates(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Шаблон тренировки' })
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.findTemplate(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать шаблон тренировки' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.createTemplate(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить шаблон тренировки' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutTemplateDto,
  ): Promise<WorkoutTemplateResponse> {
    return this.workoutsService.updateTemplate(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать личный шаблон тренировки' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.workoutsService.removeTemplate(userId, id);
  }
}

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/workouts')
export class TrainerWorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Тренировки клиентов тренера' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: TrainerWorkoutsQueryDto,
  ): Promise<PaginatedResponse<WorkoutResponse>> {
    return this.workoutsService.trainerWorkouts(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Тренировка клиента тренера' })
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.trainerWorkout(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Назначить тренировку клиенту' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateWorkoutDto,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.createWorkout(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Изменить тренировку клиента' })
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkoutDto,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.updateWorkout(userId, id, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Начать тренировку клиента' })
  start(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.trainerStartWorkout(userId, id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить тренировку клиента' })
  finish(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.trainerFinishWorkout(userId, id);
  }
}

@ApiTags('client')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('client/workouts')
export class ClientWorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Календарь тренировок клиента' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: ClientWorkoutsQueryDto,
  ): Promise<PaginatedResponse<WorkoutResponse>> {
    return this.workoutsService.clientWorkouts(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Тренировка клиента' })
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.clientWorkout(userId, id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Начать тренировку' })
  start(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.startWorkout(userId, id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить тренировку' })
  finish(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponse> {
    return this.workoutsService.finishWorkout(userId, id);
  }
}

@ApiTags('client')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('client/workout-items')
export class ClientWorkoutItemsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Put(':id/result')
  @ApiOperation({ summary: 'Отметить выполнение упражнения' })
  updateResult(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutItemResultDto,
  ): Promise<WorkoutItemResult> {
    return this.workoutsService.updateItemResult(userId, id, dto);
  }
}

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/workout-items')
export class TrainerWorkoutItemsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Put(':id/result')
  @ApiOperation({ summary: 'Отметить выполнение упражнения клиента' })
  updateResult(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkoutItemResultDto,
  ): Promise<WorkoutItemResult> {
    return this.workoutsService.updateTrainerItemResult(userId, id, dto);
  }
}
