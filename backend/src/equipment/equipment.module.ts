import { Module } from '@nestjs/common';
import {
  AdminEquipmentController,
  GymEquipmentController,
} from './equipment.controller';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [AdminEquipmentController, GymEquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
