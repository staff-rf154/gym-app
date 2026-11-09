import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatEvents } from './chat-events.service';
import { ChatGateway } from './chat.gateway';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ChatsController],
  providers: [ChatsService, ChatEvents, ChatGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
