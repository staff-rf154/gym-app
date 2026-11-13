import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { GoalsModule } from './goals/goals.module';
import { GymLinksModule } from './gym-links/gym-links.module';
import { GymsModule } from './gyms/gyms.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { PrismaModule } from './prisma/prisma.module';
import { CacheInvalidationInterceptor } from './redis/cache-invalidation.interceptor';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage';
import { RedisModule } from './redis/redis.module';
import { ReceptionModule } from './reception/reception.module';
import { ReceptionsModule } from './receptions/receptions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DemoModule } from './demo/demo.module';
import { ReportsModule } from './reports/reports.module';
import { TrainerClientsModule } from './trainer-clients/trainer-clients.module';
import { TrainersModule } from './trainers/trainers.module';
import { UploadController } from './upload/upload.controller';
import { WeightMeasurementsModule } from './weight-measurements/weight-measurements.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const required = [
          'POSTGRES_PASSWORD',
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
          'ADMIN_PHONE',
          'ADMIN_PASSWORD',
          'DEFAULT_CLIENT_PASSWORD',
          'DEFAULT_TIMEZONE',
        ];
        const secrets = [
          'POSTGRES_PASSWORD',
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
          'DEFAULT_CLIENT_PASSWORD',
          'ADMIN_PASSWORD',
        ];
        const errors: string[] = [];
        for (const key of required) {
          const value = config[key];
          if (typeof value !== 'string' || value.trim().length === 0) {
            errors.push(`${key} is required`);
          }
        }
        for (const key of secrets) {
          const value = config[key];
          if (typeof value === 'string' && /^changeme/i.test(value.trim())) {
            errors.push(`${key} must not use a placeholder value`);
          }
        }
        const accessSecret = config.JWT_SECRET;
        const refreshSecret = config.JWT_REFRESH_SECRET;
        if (typeof accessSecret === 'string' && accessSecret.length < 32) {
          errors.push('JWT_SECRET must be at least 32 characters');
        }
        if (typeof refreshSecret === 'string' && refreshSecret.length < 32) {
          errors.push('JWT_REFRESH_SECRET must be at least 32 characters');
        }
        if (accessSecret === refreshSecret) {
          errors.push('JWT_SECRET and JWT_REFRESH_SECRET must differ');
        }
        if (errors.length > 0) {
          throw new Error(
            `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
          );
        }
        return config;
      },
    }),
    RedisModule,
    PrismaModule,
    AuthModule,
    GymsModule,
    GymLinksModule,
    EquipmentModule,
    ExercisesModule,
    FoodProductsModule,
    ClientsModule,
    GoalsModule,
    TrainersModule,
    ClientTrainersModule,
    WeightMeasurementsModule,
    ReportsModule,
    WorkoutsModule,
    TrainerClientsModule,
    NutritionModule,
    NotificationsModule,
    ChatsModule,
    ReceptionsModule,
    ReceptionModule,
    DashboardModule,
    DemoModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: 100,
          },
        ],
        storage,
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        },
      },
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInvalidationInterceptor,
    },
  ],
})
export class AppModule {}
