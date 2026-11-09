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
import { GymEquipment, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminEquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get('gyms/:gymId/equipment')
  @ApiOperation({ summary: 'Оборудование зала' })
  findByGym(
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<GymEquipment[]> {
    return this.equipmentService.findAllByGym(gymId);
  }

  @Post('gyms/:gymId/equipment')
  @ApiOperation({ summary: 'Добавить оборудование в зал' })
  create(
    @Param('gymId', ParseUUIDPipe) gymId: string,
    @Body() dto: CreateEquipmentDto,
  ): Promise<GymEquipment> {
    return this.equipmentService.create(gymId, dto);
  }

  @Put('equipment/:id')
  @ApiOperation({ summary: 'Обновить оборудование' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<GymEquipment> {
    return this.equipmentService.update(id, dto);
  }

  @Delete('equipment/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить оборудование' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.equipmentService.remove(id);
  }
}

@ApiTags('shared')
@ApiBearerAuth()
@Controller('gyms/:gymId/equipment')
export class GymEquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Оборудование зала (любая роль)' })
  findAll(
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<GymEquipment[]> {
    return this.equipmentService.findAllByGym(gymId);
  }
}
