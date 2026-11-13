import { Module } from '@nestjs/common';
import {
  AdminTemplatesController,
  ClientWorkoutItemsController,
  ClientWorkoutsController,
  ReceptionTemplatesController,
  TrainerTemplatesController,
  TrainerWorkoutItemsController,
  TrainerWorkoutsController,
} from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  controllers: [
    AdminTemplatesController,
    ReceptionTemplatesController,
    TrainerTemplatesController,
    TrainerWorkoutsController,
    ClientWorkoutsController,
    ClientWorkoutItemsController,
    TrainerWorkoutItemsController,
  ],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
