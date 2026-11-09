import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkTrainerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  trainer_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gym_id!: string;
}
