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
import { Gym, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { GymsService } from './gyms.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  @ApiOperation({ summary: 'Список залов' })
  findAll(): Promise<Gym[]> {
    return this.gymsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать зал' })
  create(@Body() dto: CreateGymDto): Promise<Gym> {
    return this.gymsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Зал по id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Gym> {
    return this.gymsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить зал' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGymDto,
  ): Promise<Gym> {
    return this.gymsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить зал' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.gymsService.remove(id);
  }
}

@ApiTags('shared')
@ApiBearerAuth()
@Controller('gyms')
export class SharedGymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Get()
  @ApiOperation({ summary: 'Список залов (любая роль)' })
  findAll(): Promise<Gym[]> {
    return this.gymsService.findAll();
  }
}
