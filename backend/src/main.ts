import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AppModule } from './app.module';

function getCorsOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ??
    'http://localhost:3000,http://127.0.0.1:3000';

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.ENABLE_SWAGGER !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Gym MVP API')
      .setDescription('API спортивного зала')
      .setVersion('1.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(process.env.PORT ?? 8080);
}

void bootstrap();
