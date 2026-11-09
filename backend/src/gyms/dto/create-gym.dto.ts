import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateGymDto {
  @ApiProperty({ example: 'Фитнес-клуб «Олимп»' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'ул. Ленина, 1' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
