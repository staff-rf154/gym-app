import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GymEquipmentType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Беговая дорожка' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: GymEquipmentType, example: GymEquipmentType.CARDIO })
  @IsEnum(GymEquipmentType)
  type!: GymEquipmentType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  minWeight?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  maxWeight?: number;

  @ApiPropertyOptional({ example: '/uploads/uuid.png' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 'Профессиональная беговая дорожка' })
  @IsOptional()
  @IsString()
  description?: string;
}
