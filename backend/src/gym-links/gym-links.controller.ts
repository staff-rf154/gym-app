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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LinkGymDto } from './dto/link-gym.dto';
import {
  ClientTrainerLinkResponse,
  GymLinkResponse,
  GymLinksService,
  GymTrainerResponse,
} from './gym-links.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/trainers/:id/gyms')
export class AdminTrainerGymsController {
  constructor(private readonly gymLinksService: GymLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Залы тренера' })
  findAll(
    @Param('id', ParseUUIDPipe) trainerId: string,
  ): Promise<GymLinkResponse[]> {
    return this.gymLinksService.adminFindTrainerGyms(trainerId);
  }

  @Post()
  @ApiOperation({ summary: 'Привязать тренера к залу' })
  link(
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Body() dto: LinkGymDto,
  ): Promise<GymLinkResponse> {
    return this.gymLinksService.adminLinkTrainerGym(trainerId, dto);
  }

  @Delete(':gymId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать тренера от зала' })
  async unlink(
    @Param('id', ParseUUIDPipe) trainerId: string,
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<void> {
    await this.gymLinksService.adminUnlinkTrainerGym(trainerId, gymId);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/clients/:id/gyms')
export class AdminClientGymsController {
  constructor(private readonly gymLinksService: GymLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Залы клиента' })
  findAll(
    @Param('id', ParseUUIDPipe) clientId: string,
  ): Promise<GymLinkResponse[]> {
    return this.gymLinksService.adminFindClientGyms(clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Привязать клиента к залу' })
  link(
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: LinkGymDto,
  ): Promise<GymLinkResponse> {
    return this.gymLinksService.adminLinkClientGym(clientId, dto);
  }

  @Delete(':gymId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать клиента от зала' })
  async unlink(
    @Param('id', ParseUUIDPipe) clientId: string,
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<void> {
    await this.gymLinksService.adminUnlinkClientGym(clientId, gymId);
  }
}

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/gyms')
export class TrainerGymsController {
  constructor(private readonly gymLinksService: GymLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Мои залы' })
  findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<GymLinkResponse[]> {
    return this.gymLinksService.findTrainerGyms(userId);
  }
}

@ApiTags('client')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('client')
export class ClientGymsController {
  constructor(private readonly gymLinksService: GymLinksService) {}

  @Get('gyms')
  @ApiOperation({ summary: 'Мои залы' })
  findGyms(
    @CurrentUser('userId') userId: string,
  ): Promise<GymLinkResponse[]> {
    return this.gymLinksService.findClientGyms(userId);
  }

  @Get('gyms/:gymId/trainers')
  @ApiOperation({ summary: 'Тренеры зала' })
  findTrainers(
    @CurrentUser('userId') userId: string,
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<GymTrainerResponse[]> {
    return this.gymLinksService.findGymTrainers(userId, gymId);
  }

  @Post('gyms/:gymId/trainers/:trainerId/link')
  @ApiOperation({ summary: 'Выбрать тренера в зале' })
  linkTrainer(
    @CurrentUser('userId') userId: string,
    @Param('gymId', ParseUUIDPipe) gymId: string,
    @Param('trainerId', ParseUUIDPipe) trainerId: string,
  ): Promise<ClientTrainerLinkResponse> {
    return this.gymLinksService.linkClientTrainer(userId, gymId, trainerId);
  }

  @Get('trainers')
  @ApiOperation({ summary: 'Мои тренеры' })
  findTrainersLinks(
    @CurrentUser('userId') userId: string,
  ): Promise<ClientTrainerLinkResponse[]> {
    return this.gymLinksService.findClientTrainers(userId);
  }

  @Delete('trainers/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать тренера' })
  async unlinkTrainer(
    @CurrentUser('userId') userId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.gymLinksService.unlinkClientTrainer(userId, linkId);
  }
}
