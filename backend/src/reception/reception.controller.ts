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
import { LinkReceptionTrainerDto } from './dto/link-reception-trainer.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import {
  ReceptionClientTrainerResponse,
  ReceptionGymResponse,
  ReceptionService,
} from './reception.service';

@ApiTags('reception')
@ApiBearerAuth()
@Roles(Role.RECEPTION)
@Controller('reception')
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Get('gyms')
  @ApiOperation({ summary: 'Мой зал' })
  getGym(@CurrentUser('userId') userId: string): Promise<ReceptionGymResponse> {
    return this.receptionService.getGym(userId);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Клиенты моего зала' })
  findClients(
    @CurrentUser('userId') userId: string,
  ): Promise<ClientResponse[]> {
    return this.receptionService.findClients(userId);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Создать клиента в своём зале' })
  createClient(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateClientDto,
  ): Promise<CreateClientResponse> {
    return this.receptionService.createClient(userId, dto);
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Обновить клиента своего зала' })
  updateClient(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponse> {
    return this.receptionService.updateClient(userId, clientId, dto);
  }

  @Post('clients/:id/photo')
  @ApiOperation({ summary: 'Задать фото клиента' })
  setClientPhoto(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<ClientResponse> {
    return this.receptionService.setClientPhoto(
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
  ): Promise<ReceptionClientTrainerResponse[]> {
    return this.receptionService.findClientTrainers(userId, clientId);
  }

  @Post('clients/:id/trainers')
  @ApiOperation({ summary: 'Назначить тренера клиенту' })
  linkTrainer(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: LinkReceptionTrainerDto,
  ): Promise<ReceptionClientTrainerResponse> {
    return this.receptionService.linkTrainer(
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
    await this.receptionService.unlinkTrainer(userId, clientId, linkId);
  }

  @Get('trainers')
  @ApiOperation({ summary: 'Тренеры моего зала' })
  findTrainers(
    @CurrentUser('userId') userId: string,
  ): Promise<TrainerResponse[]> {
    return this.receptionService.findTrainers(userId);
  }

  @Post('trainers')
  @ApiOperation({ summary: 'Создать тренера в своём зале' })
  createTrainer(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTrainerDto,
  ): Promise<CreateTrainerResponse> {
    return this.receptionService.createTrainer(userId, dto);
  }

  @Put('trainers/:id')
  @ApiOperation({ summary: 'Обновить тренера своего зала' })
  updateTrainer(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: UpdateTrainerDto,
  ): Promise<TrainerResponse> {
    return this.receptionService.updateTrainer(userId, trainerId, dto);
  }

  @Post('trainers/:id/photo')
  @ApiOperation({ summary: 'Задать фото тренера' })
  setTrainerPhoto(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: UpdatePhotoDto,
  ): Promise<TrainerResponse> {
    return this.receptionService.setTrainerPhoto(
      userId,
      trainerId,
      dto.photoUrl,
    );
  }
}
