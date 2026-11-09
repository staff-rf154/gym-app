import { Module } from '@nestjs/common';
import { TrainerClientsController } from './trainer-clients.controller';
import { TrainerClientsService } from './trainer-clients.service';

@Module({
  controllers: [TrainerClientsController],
  providers: [TrainerClientsService],
})
export class TrainerClientsModule {}
