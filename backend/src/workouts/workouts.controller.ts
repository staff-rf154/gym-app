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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientWorkoutsQueryDto } from './dto/client-workouts-query.dto';
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutItemResultDto } from './dto/update-workout-item-result.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import {
  WorkoutResponse,
  WorkoutTemplateResponse,
  WorkoutsService,
} from './workouts.service';

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
  @ApiOperation({ summary: 'Удалить шаблон тренировки' })
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
  ): Promise<WorkoutResponse[]> {
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
