import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'Refresh-токен. Для web-admin не требуется: берётся из httpOnly-cookie.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  refresh_token?: string;
}
