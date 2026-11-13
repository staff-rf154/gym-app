import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ enum: ChatType })
  @IsEnum(ChatType)
  type!: ChatType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  trainer_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  admin_id?: string;
}
