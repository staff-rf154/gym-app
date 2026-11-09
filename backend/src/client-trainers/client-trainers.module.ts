import { Module } from '@nestjs/common';
import { ClientTrainersController } from './client-trainers.controller';
import { ClientTrainersService } from './client-trainers.service';

@Module({
  controllers: [ClientTrainersController],
  providers: [ClientTrainersService],
})
export class ClientTrainersModule {}
