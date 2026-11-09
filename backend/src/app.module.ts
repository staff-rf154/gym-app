import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { ClientsModule } from './clients/clients.module';
import { ClientTrainersModule } from './client-trainers/client-trainers.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { EquipmentModule } from './equipment/equipment.module';
import { ExercisesModule } from './exercises/exercises.module';
import { FoodProductsModule } from './food-products/food-products.module';
import { GymsModule } from './gyms/gyms.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { TrainerClientsModule } from './trainer-clients/trainer-clients.module';
import { TrainersModule } from './trainers/trainers.module';
import { UploadController } from './upload/upload.controller';
import { WeightMeasurementsModule } from './weight-measurements/weight-measurements.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GymsModule,
    EquipmentModule,
    ExercisesModule,
    FoodProductsModule,
    ClientsModule,
    TrainersModule,
    ClientTrainersModule,
    WeightMeasurementsModule,
    ReportsModule,
    WorkoutsModule,
    TrainerClientsModule,
    NutritionModule,
    NotificationsModule,
    ChatsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [HealthController, UploadController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
