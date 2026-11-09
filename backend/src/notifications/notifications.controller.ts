import {
  Body,
  Controller,
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
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Мои уведомления' })
  findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<NotificationResponse[]> {
    return this.notificationsService.findForUser(userId);
  }

  @Post('notifications/:id/read')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отметить уведомление прочитанным' })
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notificationsService.markRead(userId, id);
  }
}
