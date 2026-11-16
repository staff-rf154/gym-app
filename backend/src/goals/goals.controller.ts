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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Goal, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { SetClientGoalDto } from './dto/set-client-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ClientGoalResponse, GoalsService } from './goals.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/goals')
export class AdminGoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Список целей (включая неактивные)' })
  findAll(): Promise<Goal[]> {
    return this.goalsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать цель' })
  create(@Body() dto: CreateGoalDto): Promise<Goal> {
    return this.goalsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить цель' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<Goal> {
    return this.goalsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить цель' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.goalsService.remove(id);
  }
}

@ApiTags('shared')
@ApiBearerAuth()
@Roles(Role.CLIENT, Role.ADMINISTRATOR, Role.TRAINER, Role.ADMIN)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Активные цели' })
  findAll(): Promise<Goal[]> {
    return this.goalsService.findActive();
  }
}

@ApiTags('client')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('client/goal')
export class ClientGoalController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Текущая цель клиента' })
  getGoal(
    @CurrentUser('userId') userId: string,
  ): Promise<ClientGoalResponse | null> {
    return this.goalsService.getClientGoal(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Выбрать цель клиента' })
  setGoal(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetClientGoalDto,
  ): Promise<ClientGoalResponse> {
    return this.goalsService.setClientGoal(userId, dto.goalId);
  }
}
