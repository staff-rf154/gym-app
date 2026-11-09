import { Module } from '@nestjs/common';
import { FoodProductsController } from './food-products.controller';
import { FoodProductsService } from './food-products.service';

@Module({
  controllers: [FoodProductsController],
  providers: [FoodProductsService],
})
export class FoodProductsModule {}
