import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateReceptionDto {
  @ApiProperty({ example: '+79990000030' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'Мария Смирнова' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '3f1b0c2e-8f5a-4d6e-9a1b-2c3d4e5f6a7b' })
  @IsUUID()
  gym_id!: string;

  @ApiPropertyOptional({ minLength: 8, maxLength: 72 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
