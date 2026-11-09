import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTimezoneDto {
  @ApiProperty({ example: 'Europe/Moscow' })
  @IsString()
  @IsNotEmpty()
  timezone!: string;
}
