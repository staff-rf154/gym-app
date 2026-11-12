import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkGymDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gym_id!: string;
}
