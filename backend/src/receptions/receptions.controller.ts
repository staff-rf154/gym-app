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
import { Roles } from '../common/decorators/roles.decorator';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import {
  CreateReceptionResponse,
  ReceptionResponse,
  ReceptionsService,
} from './receptions.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/receptions')
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Список ресепшенов' })
  findAll(): Promise<ReceptionResponse[]> {
    return this.receptionsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать ресепшен' })
  create(@Body() dto: CreateReceptionDto): Promise<CreateReceptionResponse> {
    return this.receptionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить ресепшен' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReceptionDto,
  ): Promise<ReceptionResponse> {
    return this.receptionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить ресепшен' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.receptionsService.remove(id);
  }
}
