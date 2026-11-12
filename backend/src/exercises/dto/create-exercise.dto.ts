import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Жим лёжа' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ExerciseType, example: ExerciseType.FREE_WEIGHT })
  @IsEnum(ExerciseType)
  type!: ExerciseType;

  @ApiPropertyOptional({ example: 'Грудь' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  muscleGroup?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  requiresEquipment!: boolean;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=example' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({ example: 'Базовое упражнение' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
