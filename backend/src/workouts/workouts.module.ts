import { Module } from '@nestjs/common';
import {
  ClientWorkoutItemsController,
  ClientWorkoutsController,
  TrainerTemplatesController,
  TrainerWorkoutsController,
} from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  controllers: [
    TrainerTemplatesController,
    TrainerWorkoutsController,
    ClientWorkoutsController,
    ClientWorkoutItemsController,
  ],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
