import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWeightMeasurementDto {
  @ApiProperty({ example: 80, minimum: 0, description: 'кг' })
  @IsNumber()
  @Min(0)
  weight!: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 100, description: '%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fatMass?: number;

  @ApiProperty({ example: '2026-11-08T10:00:00.000Z', format: 'date-time' })
  @IsDateString()
  measuredAt!: string;

  @ApiPropertyOptional({ example: 'Утренний замер' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
