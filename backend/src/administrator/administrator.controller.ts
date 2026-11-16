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
import { Role, WeightMeasurement } from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { CreateWeightMeasurementDto } from '../weight-measurements/dto/create-weight-measurement.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientResponse, CreateClientResponse } from '../clients/clients.service';
import { CreateClientDto } from '../clients/dto/create-client.dto';
import { UpdateClientDto } from '../clients/dto/update-client.dto';
import { CreateTrainerDto } from '../trainers/dto/create-trainer.dto';
import { UpdateTrainerDto } from '../trainers/dto/update-trainer.dto';
import {
  CreateTrainerResponse,
  TrainerResponse,
} from '../trainers/trainers.service';
import { LinkAdministratorTrainerDto } from './dto/link-administrator-trainer.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import {
  AdministratorClientTrainerResponse,
  AdministratorGymResponse,
  AdministratorService,
} from './administrator.service';

@ApiTags('administrator')
@ApiBearerAuth()
@Roles(Role.ADMINISTRATOR)
@Controller('administrator')
export class AdministratorController {
  constructor(private readonly administratorService: AdministratorService) {}

  @Get('gyms')
  @ApiOperation({ summary: 'Мой зал' })
  getGym(@CurrentUser('userId') userId: string): Promise<AdministratorGymResponse> {
    return this.administratorService.getGym(userId);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Клиенты моего зала' })
  findClients(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<ClientResponse>> {
    return this.administratorService.findClients(userId, query);
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Клиент своего зала' })
  findClient(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<ClientResponse> {
    return this.administratorService.findClient(userId, clientId);
  }

  @Get('clients/:id/weight-measurements')
  @ApiOperation({ summary: 'Замеры веса клиента своего зала' })
  findWeightMeasurements(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<WeightMeasurement[]> {
    return this.administratorService.findWeightMeasurements(userId, clientId);
  }

  @Post('clients/:id/weight-measurements')
  @ApiOperation({ summary: 'Добавить замер веса клиента своего зала' })
  createWeightMeasurement(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateWeightMeasurementDto,
  ): Promise<WeightMeasurement> {
    return this.administratorService.createWeightMeasurement(
      userId,
      clientId,
      dto,
    );
  }

  @Post('clients/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сбросить пароль клиента своего зала' })
  resetClientPassword(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ new_password: string }> {
    return this.administratorService.resetClientPassword(
      userId,
      clientId,
      dto.password,
    );
  }

  @Post('clients')
  @ApiOperation({ summary: 'Создать клиента в своём зале' })
  createClient(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateClientDto,
  ): Promise<CreateClientResponse> {
    return this.administratorService.createClient(userId, dto);
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Обновить клиента своего зала' })
  updateClient(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponse> {
    return this.administratorService.updateClient(userId, clientId, dto);
  }

  @Post('clients/:id/photo')
  @ApiOperation({ summary: 'Задать фото клиента' })
  setClientPhoto(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<ClientResponse> {
    return this.administratorService.setClientPhoto(
      userId,
      clientId,
      dto.photoUrl,
    );
  }

  @Get('clients/:id/trainers')
  @ApiOperation({ summary: 'Тренеры клиента в моём зале' })
  findClientTrainers(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<AdministratorClientTrainerResponse[]> {
    return this.administratorService.findClientTrainers(userId, clientId);
  }

  @Post('clients/:id/trainers')
  @ApiOperation({ summary: 'Назначить тренера клиенту' })
  linkTrainer(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: LinkAdministratorTrainerDto,
  ): Promise<AdministratorClientTrainerResponse> {
    return this.administratorService.linkTrainer(
      userId,
      clientId,
      dto.trainer_id,
    );
  }

  @Delete('clients/:id/trainers/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать тренера от клиента' })
  async unlinkTrainer(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.administratorService.unlinkTrainer(userId, clientId, linkId);
  }

  @Get('trainers')
  @ApiOperation({ summary: 'Тренеры моего зала' })
  findTrainers(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<TrainerResponse>> {
    return this.administratorService.findTrainers(userId, query);
  }

  @Post('trainers/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сбросить пароль тренера своего зала' })
  resetTrainerPassword(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ new_password: string }> {
    return this.administratorService.resetTrainerPassword(
      userId,
      trainerId,
      dto.password,
    );
  }

  @Post('trainers')
  @ApiOperation({ summary: 'Создать тренера в своём зале' })
  createTrainer(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTrainerDto,
  ): Promise<CreateTrainerResponse> {
    return this.administratorService.createTrainer(userId, dto);
  }

  @Put('trainers/:id')
  @ApiOperation({ summary: 'Обновить тренера своего зала' })
  updateTrainer(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: UpdateTrainerDto,
  ): Promise<TrainerResponse> {
    return this.administratorService.updateTrainer(userId, trainerId, dto);
  }

  @Post('trainers/:id/photo')
  @ApiOperation({ summary: 'Задать фото тренера' })
  setTrainerPhoto(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<TrainerResponse> {
    return this.administratorService.setTrainerPhoto(
      userId,
      trainerId,
      dto.photoUrl,
    );
  }
}
