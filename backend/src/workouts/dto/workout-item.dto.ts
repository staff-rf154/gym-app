import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class WorkoutTemplateItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  exerciseId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @ApiPropertyOptional({ nullable: true, description: 'кг' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedWeight?: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  plannedSets!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  plannedReps!: number;

  @ApiPropertyOptional({ nullable: true, description: 'сек' })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSec?: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  order!: number;
}
