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
import { FoodProduct, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateFoodProductDto } from './dto/create-food-product.dto';
import { UpdateFoodProductDto } from './dto/update-food-product.dto';
import { FoodProductsService } from './food-products.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/food-products')
export class FoodProductsController {
  constructor(private readonly foodProductsService: FoodProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Список продуктов питания' })
  findAll(): Promise<FoodProduct[]> {
    return this.foodProductsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать продукт питания' })
  create(@Body() dto: CreateFoodProductDto): Promise<FoodProduct> {
    return this.foodProductsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить продукт питания' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFoodProductDto,
  ): Promise<FoodProduct> {
    return this.foodProductsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить продукт питания' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.foodProductsService.remove(id);
  }
}
