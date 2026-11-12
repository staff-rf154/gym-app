import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePushTokenDto {
  @ApiProperty({ description: 'FCM registration token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;
}
