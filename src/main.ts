import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { Config } from './config/config.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService<Config> = app.get(ConfigService);
  const port = Number.parseInt(configService.get<string>('PORT'));
  const origin = configService.get<string>('RECENT_MESSAGES_CORS_ORIGIN');

  app.enableCors({ origin: [origin, 'http://localhost:3001'] });

  app.use(cookieParser());
  app.enableShutdownHooks();

  await app.listen(port);
}

bootstrap();
