import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class LinkAdministratorTrainerDto {
  @ApiProperty({ example: '3f1b0c2e-8f5a-4d6e-9a1b-2c3d4e5f6a7b' })
  @IsUUID()
  trainer_id!: string;
}
