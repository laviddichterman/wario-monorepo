import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, PinoLogger } from 'nestjs-pino';

import { CatalogModule } from 'src/infrastructure/database/mongoose/models/catalog/catalog.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScopesGuard } from './auth/guards/scopes.guard';
import { AppConfigService } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { ErrorNotificationService } from './config/error-notification/error-notification.service';
import { buildTypeOrmConfig } from './config/typeorm-config.helper';
import { ControllersModule } from './controllers/controllers.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { OrdersModule } from './infrastructure/database/mongoose/models/orders/orders.module';
import { QueryModule } from './infrastructure/database/mongoose/models/query/query.module';
import { SettingsModule } from './infrastructure/database/mongoose/models/settings/settings.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        // Use pino-pretty for development, JSON for production
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        // Redact sensitive headers
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        // Auto-log requests and responses
        autoLogging: true,
        // Custom log level based on response status
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // Custom success message
        customSuccessMessage: (req, res) => {
          return `${String(req.method)} ${String(req.url)} completed with ${res.statusCode.toString()}`;
        },
        // Custom error message
        customErrorMessage: (req, _res, err) => {
          return `${String(req.method)} ${String(req.url)} failed: ${err.message}`;
        },
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (appConfig: AppConfigService) => ({
        uri: appConfig.mongoUri,
        user: appConfig.dbUser,
        pass: appConfig.dbPass,
      }),
      inject: [AppConfigService],
    }),
    // PostgreSQL via TypeORM - enabled via USE_POSTGRES feature flag
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (appConfig: AppConfigService) => {
        // Skip Postgres connection entirely when not using Postgres
        if (!appConfig.usePostgres) {
          return {
            type: 'postgres' as const,
            host: '', // Empty host prevents actual connection
            synchronize: false,
            migrationsRun: false,
            autoLoadEntities: false,
            retryAttempts: 0, // Don't retry on connection failure
          };
        }

        return {
          ...buildTypeOrmConfig(
            {
              host: appConfig.postgresHost,
              port: appConfig.postgresPort,
              username: appConfig.postgresUser,
              password: appConfig.postgresPassword,
              database: appConfig.postgresDatabase,
              isProduction: appConfig.isProduction,
            },
            {
              migrationsRun: !appConfig.allowSchemaSync,
              synchronize: appConfig.allowSchemaSync,
            },
            __dirname,
          ),
          autoLoadEntities: true,
        };
      },
      inject: [AppConfigService],
    }),
    OrdersModule,
    CatalogModule,
    SettingsModule,
    QueryModule,
    ConfigModule,
    ControllersModule,
    AuthModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useFactory: (logger: PinoLogger, errorNotificationService: ErrorNotificationService) => {
        return new AllExceptionsFilter(logger, errorNotificationService);
      },
      inject: [PinoLogger, ErrorNotificationService],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopesGuard,
    },
  ],
})
export class AppModule { }
