import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  TrainerClientResponse,
  TrainerClientsService,
} from './trainer-clients.service';

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/clients')
export class TrainerClientsController {
  constructor(private readonly trainerClientsService: TrainerClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои клиенты (активная связь)' })
  findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<TrainerClientResponse[]> {
    return this.trainerClientsService.findAll(userId);
  }
}
