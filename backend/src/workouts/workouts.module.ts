import { Module } from '@nestjs/common';
import {
  ClientWorkoutItemsController,
  ClientWorkoutsController,
  TrainerTemplatesController,
  TrainerWorkoutItemsController,
  TrainerWorkoutsController,
} from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  controllers: [
    TrainerTemplatesController,
    TrainerWorkoutsController,
    ClientWorkoutsController,
    ClientWorkoutItemsController,
    TrainerWorkoutItemsController,
  ],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
