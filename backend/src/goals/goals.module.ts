import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import {
  AdminGoalsController,
  ClientGoalController,
  GoalsController,
} from './goals.controller';

@Module({
  controllers: [AdminGoalsController, GoalsController, ClientGoalController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
