import { Module } from '@nestjs/common';
import {
  AdminExercisesController,
  SharedExercisesController,
} from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  controllers: [AdminExercisesController, SharedExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
