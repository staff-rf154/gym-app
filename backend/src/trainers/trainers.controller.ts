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
import { Role } from '@prisma/client';
import { PaginatedResponse } from '../common/dto/pagination-query.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { TrainerListQueryDto } from './dto/trainer-list-query.dto';
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
  findAll(
    @Query() query: TrainerListQueryDto,
  ): Promise<PaginatedResponse<TrainerResponse>> {
    return this.trainersService.findAll(undefined, query);
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

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сбросить пароль тренера' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ new_password: string }> {
    return this.trainersService.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Архивировать тренера' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.trainersService.remove(id);
  }
}
