import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 128,
    description:
      'Новый пароль. Если не передан, используется DEFAULT_CLIENT_PASSWORD.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
