import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ example: 'Жим лёжа' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ExerciseType, example: ExerciseType.FREE_WEIGHT })
  @IsEnum(ExerciseType)
  type!: ExerciseType;

  @ApiPropertyOptional({ example: 'Грудь' })
  @IsOptional()
  @IsString()
  muscleGroup?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  requiresEquipment!: boolean;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=example' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 'Базовое упражнение' })
  @IsOptional()
  @IsString()
  description?: string;
}
