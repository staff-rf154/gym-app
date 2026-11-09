import { Module } from '@nestjs/common';
import { GymsController, SharedGymsController } from './gyms.controller';
import { GymsService } from './gyms.service';

@Module({
  controllers: [GymsController, SharedGymsController],
  providers: [GymsService],
})
export class GymsModule {}
