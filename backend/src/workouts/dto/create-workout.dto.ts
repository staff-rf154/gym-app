import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { WorkoutTemplateItemDto } from './workout-item.dto';

export class CreateWorkoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  client_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gym_id!: string;

  @ApiProperty({ example: '2026-11-08', format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  template_id?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiProperty({ type: [WorkoutTemplateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkoutTemplateItemDto)
  items!: WorkoutTemplateItemDto[];
}
