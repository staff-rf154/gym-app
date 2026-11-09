import { Module } from '@nestjs/common';
import { WeightMeasurementsController } from './weight-measurements.controller';
import { WeightMeasurementsService } from './weight-measurements.service';

@Module({
  controllers: [WeightMeasurementsController],
  providers: [WeightMeasurementsService],
})
export class WeightMeasurementsModule {}
