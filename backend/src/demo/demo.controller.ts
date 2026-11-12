import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  DemoClearResult,
  DemoLoadResult,
  DemoService,
  DemoStatus,
} from './demo.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус демо-данных' })
  status(): Promise<DemoStatus> {
    return this.demoService.status();
  }

  @Post('load')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Загрузить демо-данные' })
  load(): Promise<DemoLoadResult> {
    return this.demoService.load();
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Очистить демо-данные' })
  clear(): Promise<DemoClearResult> {
    return this.demoService.clear();
  }
}
