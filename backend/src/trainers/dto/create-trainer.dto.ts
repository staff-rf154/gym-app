import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrainerDto {
  @ApiProperty({ example: '+79990000020' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'Пётр Петров' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '/uploads/trainer.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
