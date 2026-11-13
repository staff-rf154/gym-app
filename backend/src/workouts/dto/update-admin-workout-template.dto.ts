import { PartialType } from '@nestjs/swagger';
import { CreateAdminWorkoutTemplateDto } from './create-admin-workout-template.dto';

export class UpdateAdminWorkoutTemplateDto extends PartialType(
  CreateAdminWorkoutTemplateDto,
) {}
