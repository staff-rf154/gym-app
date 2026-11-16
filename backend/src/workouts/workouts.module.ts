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
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
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
