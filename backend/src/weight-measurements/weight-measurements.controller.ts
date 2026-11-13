import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, WeightMeasurement } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateWeightMeasurementDto } from './dto/create-weight-measurement.dto';
import { WeightMeasurementsService } from './weight-measurements.service';

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('client')
export class WeightMeasurementsController {
  constructor(
    private readonly weightMeasurementsService: WeightMeasurementsService,
  ) {}

  @Get(':id/weight-measurements')
  @ApiOperation({ summary: 'История замеров клиента' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<WeightMeasurement[]> {
    return this.weightMeasurementsService.findAll(userId, clientId);
  }

  @Post(':id/weight-measurements')
  @ApiOperation({ summary: 'Добавить замер клиента' })
  create(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    return this.weightMeasurementsService.create(userId, clientId, dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/clients')
export class AdminWeightMeasurementsController {
  constructor(
    private readonly weightMeasurementsService: WeightMeasurementsService,
  ) {}

  @Get(':id/weight-measurements')
  @ApiOperation({ summary: 'История замеров клиента (администратор)' })
  findAll(
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<WeightMeasurement[]> {
    return this.weightMeasurementsService.findAllForAdmin(clientId);
  }

  @Post(':id/weight-measurements')
  @ApiOperation({ summary: 'Добавить замер клиента (администратор)' })
  create(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    return this.weightMeasurementsService.createForAdmin(
      userId,
      clientId,
      dto,
    );
  }
}
