import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: '+79990000010' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '/uploads/client.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

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

  @ApiPropertyOptional({ example: 'Похудение', deprecated: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  goal?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'ID цели из справочника' })
  @IsOptional()
  @IsUUID()
  goalId?: string;

  @ApiPropertyOptional({ example: 'Травма колена в анамнезе' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
