import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WorkoutTemplateItemDto } from './workout-item.dto';

export class CreateWorkoutTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [WorkoutTemplateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkoutTemplateItemDto)
  items!: WorkoutTemplateItemDto[];
}
