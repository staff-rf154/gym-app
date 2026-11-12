import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTimezoneDto {
  @ApiProperty({ example: 'Europe/Moscow' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  timezone!: string;
}
