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
import {
  ClientResponse,
  ClientsService,
  CreateClientResponse,
} from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Список клиентов' })
  findAll(): Promise<ClientResponse[]> {
    return this.clientsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать клиента' })
  create(@Body() dto: CreateClientDto): Promise<CreateClientResponse> {
    return this.clientsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить клиента' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponse> {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить клиента' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.clientsService.remove(id);
  }
}
