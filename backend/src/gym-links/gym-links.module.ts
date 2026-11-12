import { Module } from '@nestjs/common';
import {
  AdminClientGymsController,
  AdminTrainerGymsController,
  ClientGymsController,
  TrainerGymsController,
} from './gym-links.controller';
import { GymLinksService } from './gym-links.service';

@Module({
  controllers: [
    AdminTrainerGymsController,
    AdminClientGymsController,
    TrainerGymsController,
    ClientGymsController,
  ],
  providers: [GymLinksService],
})
export class GymLinksModule {}
