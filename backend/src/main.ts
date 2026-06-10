import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS — allow all origins for development
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Shop-Domain', 'X-Shopify-Hmac-Sha256'],
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger docs (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Filedrop API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Filedrop API running on http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/api\n`);
}

bootstrap();
