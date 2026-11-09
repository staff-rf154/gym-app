import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
