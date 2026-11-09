import { Module } from '@nestjs/common';
import {
  ClientNutritionController,
  TrainerNutritionController,
} from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  controllers: [TrainerNutritionController, ClientNutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
