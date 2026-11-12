import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GymEquipmentType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Беговая дорожка' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: GymEquipmentType, example: GymEquipmentType.CARDIO })
  @IsEnum(GymEquipmentType)
  type!: GymEquipmentType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWeight?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional({ example: '/uploads/uuid.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'Профессиональная беговая дорожка' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
