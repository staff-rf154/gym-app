import { Injectable, NotFoundException } from '@nestjs/common';
import { FoodProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFoodProductDto } from './dto/create-food-product.dto';
import { UpdateFoodProductDto } from './dto/update-food-product.dto';

@Injectable()
export class FoodProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<FoodProduct[]> {
    return this.prisma.foodProduct.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string): Promise<FoodProduct> {
    const product = await this.prisma.foodProduct.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Food product not found');
    }

    return product;
  }

  create(dto: CreateFoodProductDto): Promise<FoodProduct> {
    return this.prisma.foodProduct.create({ data: dto });
  }

  async update(
    id: string,
    dto: UpdateFoodProductDto,
  ): Promise<FoodProduct> {
    await this.findOne(id);

    return this.prisma.foodProduct.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.foodProduct.delete({ where: { id } });
  }
}
