import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScopesGuard } from './auth/guards/scopes.guard';
import { ConfigModule } from './config/config.module';
import { ErrorNotificationService } from './config/error-notification/error-notification.service';
import { ControllersModule } from './controllers/controllers.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { CatalogModule } from './models/catalog/catalog.module';
import { OrdersModule } from './models/orders/orders.module';
import { QueryModule } from './models/query/query.module';
import { SettingsModule } from './models/settings/settings.module';
import { TasksModule } from './tasks/tasks.module';


@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const DBTABLE = process.env.DBTABLE || '';
        const DBUSER = process.env.DBUSER || undefined;
        const DBPASS = process.env.DBPASS || undefined;
        const DBENDPOINT = process.env.DBENDPOINT || '127.0.0.1:27017';

        return {
          uri: `mongodb://${DBENDPOINT}/${DBTABLE}`,
          user: DBUSER,
          pass: DBPASS,
        };
      },
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
      useFactory: (errorNotificationService: ErrorNotificationService) => {
        return new AllExceptionsFilter(errorNotificationService);
      },
      inject: [ErrorNotificationService],
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

