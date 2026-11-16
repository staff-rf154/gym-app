import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatEvents } from './chat-events.service';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatEvents, ChatGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
