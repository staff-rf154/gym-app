import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutritionType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateNutritionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  client_id!: string;

  @ApiProperty({ enum: NutritionType })
  @IsEnum(NutritionType)
  type!: NutritionType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: '2026-11-01', format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'validFrom must be in YYYY-MM-DD format',
  })
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-11-30', format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'validTo must be in YYYY-MM-DD format',
  })
  validTo?: string;
}
