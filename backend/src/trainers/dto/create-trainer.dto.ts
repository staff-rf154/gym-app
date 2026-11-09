import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTrainerDto {
  @ApiProperty({ example: '+79990000020' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'Пётр Петров' })
  @IsString()
  name!: string;
}
