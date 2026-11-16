import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';
import {
  CreateAdministratorResponse,
  AdministratorResponse,
  AdministratorsService,
} from './administrators.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/administrators')
export class AdministratorsController {
  constructor(private readonly administratorsService: AdministratorsService) {}

  @Get()
  @ApiOperation({ summary: 'Список администраторов' })
  findAll(): Promise<AdministratorResponse[]> {
    return this.administratorsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать администратора' })
  create(@Body() dto: CreateAdministratorDto): Promise<CreateAdministratorResponse> {
    return this.administratorsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить администратора' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdministratorDto,
  ): Promise<AdministratorResponse> {
    return this.administratorsService.update(id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сбросить пароль администратора' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ new_password: string }> {
    return this.administratorsService.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить администратора' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.administratorsService.remove(id);
  }
}
