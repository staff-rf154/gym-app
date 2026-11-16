import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  NotificationResponse,
  NotificationsService,
} from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('admin/notifications')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Отправить уведомление клиентам' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    return this.notificationsService.create(userId, dto);
  }

  @Get('notifications')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN, Role.ADMINISTRATOR)
  @ApiOperation({ summary: 'Мои уведомления' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<NotificationResponse>> {
    return this.notificationsService.findForUser(userId, query);
  }

  @Post('notifications/:id/read')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN, Role.ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notificationsService.markRead(userId, id);
  }
}
