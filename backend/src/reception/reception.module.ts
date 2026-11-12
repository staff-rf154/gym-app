import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { TrainersModule } from '../trainers/trainers.module';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';

@Module({
  imports: [ClientsModule, TrainersModule],
  controllers: [ReceptionController],
  providers: [ReceptionService],
})
export class ReceptionModule {}
