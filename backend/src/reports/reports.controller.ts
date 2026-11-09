import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ExerciseProgressQueryDto } from './dto/exercise-progress-query.dto';
import { ExercisesSummaryQueryDto } from './dto/exercises-summary-query.dto';
import { WeightDynamicsQueryDto } from './dto/weight-dynamics-query.dto';
import {
  ExerciseProgressResponse,
  ExerciseSummaryItem,
  ReportsService,
  WeightDynamicsPoint,
} from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weight-dynamics')
  @ApiOperation({ summary: 'Динамика веса и жира' })
  weightDynamics(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: WeightDynamicsQueryDto,
  ): Promise<WeightDynamicsPoint[]> {
    return this.reportsService.weightDynamics(userId, role, query);
  }

  @Get('exercise-progress')
  @ApiOperation({ summary: 'Прогресс по упражнению (план vs факт)' })
  exerciseProgress(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ExerciseProgressQueryDto,
  ): Promise<ExerciseProgressResponse> {
    return this.reportsService.exerciseProgress(userId, role, query);
  }

  @Get('exercises-summary')
  @ApiOperation({ summary: 'Упражнения с историей' })
  exercisesSummary(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ExercisesSummaryQueryDto,
  ): Promise<ExerciseSummaryItem[]> {
    return this.reportsService.exercisesSummary(userId, role, query);
  }
}
