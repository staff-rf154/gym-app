import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGymDto {
  @ApiProperty({ example: 'Фитнес-клуб «Олимп»' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'ул. Ленина, 1' })
  @IsString()
  @MaxLength(300)
  address!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
