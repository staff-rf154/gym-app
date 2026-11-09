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
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import {
  CreateTrainerResponse,
  TrainerResponse,
  TrainersService,
} from './trainers.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @ApiOperation({ summary: 'Список тренеров' })
  findAll(): Promise<TrainerResponse[]> {
    return this.trainersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать тренера' })
  create(@Body() dto: CreateTrainerDto): Promise<CreateTrainerResponse> {
    return this.trainersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить тренера' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainerDto,
  ): Promise<TrainerResponse> {
    return this.trainersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить тренера' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.trainersService.remove(id);
  }
}
