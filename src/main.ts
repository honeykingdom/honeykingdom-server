import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppAwakeService } from './app-awake/app-awake.service';
import { AppModule } from './app.module';
import { Config } from './config/config.interface';
import CustomLogger from './custom-logger/custom-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    autoFlushLogs: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(CustomLogger));
  app.get(AppAwakeService).subscribeToShutdown(async () => {
    await app.close();
    process.exit();
  });
  const configService: ConfigService<Config> = app.get(ConfigService);
  const port = Number.parseInt(configService.get<string>('PORT'));

  const origin = configService.get<string>('APP_CORS_ORIGINS').split(';');
  origin.push(configService.get<string>('HONEY_VOTES_FRONTEND_BASE_URL'));
  if (configService.get('NODE_ENV', { infer: true }) !== 'production') {
    origin.push('http://localhost:3001');
  }

  app.enableCors({ origin });

  app.use(cookieParser());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('HoneyKingdom')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(port);
}

bootstrap();
