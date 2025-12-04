import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { ControllersModule } from './controllers/controllers.module';
import { CatalogModule } from './models/catalog/catalog.module';
import { OrdersModule } from './models/orders/orders.module';
import { QueryModule } from './models/query/query.module';
import { SettingsModule } from './models/settings/settings.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
