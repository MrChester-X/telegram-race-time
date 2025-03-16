import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import * as process from 'node:process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });

  const swaggerConfig = new DocumentBuilder().setTitle('Racing Parser').setVersion('1.0').build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT || 3000);

  const appUri = await app.getUrl();
  Logger.log(`🚀 Application is running on: ${appUri}`);
}

bootstrap().then();
