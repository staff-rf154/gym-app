import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetClientGoalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  goalId!: string;
}
