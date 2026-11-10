import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TrainerNutritionQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  client_id!: string;
}
