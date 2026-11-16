import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TrainerClientsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  gym_id?: string;

  @ApiPropertyOptional({ description: 'Поиск по ФИО' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
