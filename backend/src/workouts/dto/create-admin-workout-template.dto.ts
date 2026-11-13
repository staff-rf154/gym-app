import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateWorkoutTemplateDto } from './create-workout-template.dto';

export class CreateAdminWorkoutTemplateDto extends CreateWorkoutTemplateDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Зал шаблона; null — глобальный шаблон',
  })
  @IsOptional()
  @IsUUID()
  gym_id?: string | null;
}
