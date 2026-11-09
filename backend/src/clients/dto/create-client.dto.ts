import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: '+79990000010' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 180, minimum: 0, description: 'см' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ example: '1990-01-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @ApiPropertyOptional({ example: 80, minimum: 0, description: 'кг' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startWeight?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0, maximum: 100, description: '%' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  startFatMass?: number;

  @ApiPropertyOptional({ example: 'Похудение' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: 'Травма колена в анамнезе' })
  @IsOptional()
  @IsString()
  notes?: string;
}
