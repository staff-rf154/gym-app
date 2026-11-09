import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ClientWorkoutsQueryDto {
  @ApiProperty({ example: '2026-11-01', format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be in YYYY-MM-DD format',
  })
  from!: string;

  @ApiProperty({ example: '2026-11-30', format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be in YYYY-MM-DD format',
  })
  to!: string;
}
