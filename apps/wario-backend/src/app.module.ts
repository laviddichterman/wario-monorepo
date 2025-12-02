import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
