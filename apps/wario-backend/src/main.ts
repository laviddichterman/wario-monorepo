import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { SocketIoAdapter } from './infrastructure/messaging/socket-io/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino logger for all NestJS logging
  app.useLogger(app.get(Logger));

  // Enable CORS with configured origins
  const appConfig = app.get(AppConfigService);
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
  });

  app.useWebSocketAdapter(new SocketIoAdapter(app, appConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(appConfig.port);
}
void bootstrap();
