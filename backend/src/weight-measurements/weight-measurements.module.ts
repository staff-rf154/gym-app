import { Module } from '@nestjs/common';
import {
  AdminWeightMeasurementsController,
  WeightMeasurementsController,
} from './weight-measurements.controller';
import { WeightMeasurementsService } from './weight-measurements.service';

@Module({
  controllers: [
    WeightMeasurementsController,
    AdminWeightMeasurementsController,
  ],
  providers: [WeightMeasurementsService],
})
export class WeightMeasurementsModule {}
