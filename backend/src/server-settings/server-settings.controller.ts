import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateServerSettingsDto } from './dto/update-server-settings.dto';
import {
  ServerSettingsResponse,
  ServerSettingsService,
} from './server-settings.service';

const MAX_CERT_FILE_SIZE = 1024 * 1024;

interface UploadedPemFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface CertificateFiles {
  certificate?: UploadedPemFile[];
  privateKey?: UploadedPemFile[];
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/server')
export class ServerSettingsController {
  constructor(private readonly serverSettings: ServerSettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки HTTPS-сервера' })
  settings(): Promise<ServerSettingsResponse> {
    return this.serverSettings.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Изменить порт HTTPS-сервера' })
  update(
    @Body() dto: UpdateServerSettingsDto,
  ): Promise<ServerSettingsResponse> {
    return this.serverSettings.updatePort(dto.port);
  }

  @Post('certificate')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'certificate', maxCount: 1 },
        { name: 'privateKey', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: MAX_CERT_FILE_SIZE,
          files: 2,
        },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['certificate', 'privateKey'],
      properties: {
        certificate: { type: 'string', format: 'binary' },
        privateKey: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Загрузить сертификат и приватный ключ' })
  uploadCertificate(
    @UploadedFiles() files?: CertificateFiles,
  ): Promise<ServerSettingsResponse> {
    const certificate = files?.certificate?.[0];
    const privateKey = files?.privateKey?.[0];

    if (!certificate || !privateKey) {
      throw new BadRequestException(
        'Нужно загрузить сертификат и приватный ключ',
      );
    }

    return this.serverSettings.uploadCertificate(
      certificate.buffer,
      privateKey.buffer,
    );
  }

  @Post('certificate/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вернуть встроенный сертификат' })
  resetCertificate(): Promise<ServerSettingsResponse> {
    return this.serverSettings.resetCertificate();
  }
}
