import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientTrainer, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientTrainersService } from './client-trainers.service';
import { LinkTrainerDto } from './dto/link-trainer.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/clients')
export class ClientTrainersController {
  constructor(private readonly clientTrainersService: ClientTrainersService) {}

  @Post(':id/trainers')
  @ApiOperation({ summary: 'Привязать тренера к клиенту' })
  link(
    @Param('id', ParseUUIDPipe) clientId: string,
    @Body() dto: LinkTrainerDto,
  ): Promise<ClientTrainer> {
    return this.clientTrainersService.link(clientId, dto);
  }

  @Delete(':id/trainers/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать тренера (isActive=false)' })
  async unlink(
    @Param('id', ParseUUIDPipe) clientId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.clientTrainersService.unlink(clientId, linkId);
  }
}
