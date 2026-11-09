import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ExerciseFilterDto {
  @ApiPropertyOptional({ enum: ExerciseType })
  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;

  @ApiPropertyOptional({ example: 'Грудь' })
  @IsOptional()
  @IsString()
  muscle_group?: string;

  @ApiPropertyOptional({ example: 'жим' })
  @IsOptional()
  @IsString()
  q?: string;
}
