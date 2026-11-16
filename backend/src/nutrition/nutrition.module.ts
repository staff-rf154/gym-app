import { Module } from '@nestjs/common';
import {
  ClientNutritionController,
  TrainerNutritionController,
} from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TrainerNutritionController, ClientNutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
