import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Message, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ChatResponse, ChatsService } from './chats.service';
import { MessagesQueryDto, SendMessageDto } from './dto/message.dto';

@ApiTags('shared')
@ApiBearerAuth()
@Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'Мои чаты' })
  findAll(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: Role,
  ): Promise<ChatResponse[]> {
    return this.chatsService.findChats(userId, role);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'История сообщений чата' })
  findMessages(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessagesQueryDto,
  ): Promise<Message[]> {
    return this.chatsService.findMessages(userId, id, query);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Отправить сообщение' })
  sendMessage(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<Message> {
    return this.chatsService.sendMessage(userId, id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Отметить сообщения чата прочитанными' })
  async markRead(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ ok: true }> {
    await this.chatsService.markRead(userId, id);
    return { ok: true };
  }
}
