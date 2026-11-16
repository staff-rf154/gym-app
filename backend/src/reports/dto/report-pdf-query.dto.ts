import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportPdfQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({
    enum: ['week', 'previousWeek', 'month', '3months', 'year', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['week', 'previousWeek', 'month', '3months', 'year', 'custom'])
  period?: 'week' | 'previousWeek' | 'month' | '3months' | 'year' | 'custom';

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  gym_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  trainer_id?: string;
}
