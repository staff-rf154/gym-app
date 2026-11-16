import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { TrainersModule } from '../trainers/trainers.module';
import { WeightMeasurementsModule } from '../weight-measurements/weight-measurements.module';
import { AdministratorController } from './administrator.controller';
import { AdministratorService } from './administrator.service';

@Module({
  imports: [ClientsModule, TrainersModule, WeightMeasurementsModule],
  controllers: [AdministratorController],
  providers: [AdministratorService],
})
export class AdministratorModule {}
