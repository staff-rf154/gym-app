import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NutritionRecommendation, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientNutritionQueryDto } from './dto/client-nutrition-query.dto';
import { CreateNutritionDto } from './dto/create-nutrition.dto';
import { NutritionService } from './nutrition.service';

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(Role.TRAINER)
@Controller('trainer/nutrition')
export class TrainerNutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post()
  @ApiOperation({ summary: 'Назначить питание клиенту' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateNutritionDto,
  ): Promise<NutritionRecommendation> {
    return this.nutritionService.create(userId, dto);
  }
}

@ApiTags('client')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('client/nutrition')
export class ClientNutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get()
  @ApiOperation({ summary: 'Питание клиента на дату' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: ClientNutritionQueryDto,
  ): Promise<NutritionRecommendation[]> {
    return this.nutritionService.findClientNutrition(userId, query);
  }
}
