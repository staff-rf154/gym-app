import { PartialType } from '@nestjs/swagger';
import { CreateFoodProductDto } from './create-food-product.dto';

export class UpdateFoodProductDto extends PartialType(CreateFoodProductDto) {}
