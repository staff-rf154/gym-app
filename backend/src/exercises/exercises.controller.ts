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
import { Exercise, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExerciseFilterDto } from './dto/exercise-filter.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/exercises')
export class AdminExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Список упражнений' })
  findAll(): Promise<Exercise[]> {
    return this.exercisesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать упражнение' })
  create(@Body() dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercisesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить упражнение' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    return this.exercisesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить упражнение' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.exercisesService.remove(id);
  }
}

@ApiTags('shared')
@ApiBearerAuth()
@Controller('exercises')
export class SharedExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Список упражнений (любая роль)' })
  findAll(@Query() filter: ExerciseFilterDto): Promise<Exercise[]> {
    return this.exercisesService.findAll(filter);
  }
}
