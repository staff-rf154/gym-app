import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateWorkoutItemResultDto {
  @ApiProperty()
  @IsBoolean()
  done!: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'кг' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWeight?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  actualReps?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  clientComment?: string;
}
