import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdatePhotoDto {
  @ApiProperty({ example: '/uploads/photo.jpg' })
  @IsString()
  @MaxLength(500)
  photoUrl!: string;
}
