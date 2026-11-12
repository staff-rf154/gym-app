import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateFoodProductDto {
  @ApiProperty({ example: 'Куриная грудка' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 165, minimum: 0 })
  @IsNumber()
  @Min(0)
  kcal!: number;

  @ApiProperty({ example: 31, minimum: 0 })
  @IsNumber()
  @Min(0)
  protein!: number;

  @ApiProperty({ example: 3.6, minimum: 0 })
  @IsNumber()
  @Min(0)
  fat!: number;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  carbs!: number;
}
