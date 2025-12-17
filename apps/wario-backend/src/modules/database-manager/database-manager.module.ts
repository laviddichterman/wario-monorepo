import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigService } from 'src/config/app-config.service';
import { AppConfigurationModule } from 'src/config/app-configuration.module';
import { DBVersionEntity } from 'src/entities/settings/db-version.entity';
import DBVersionModel from '../../models/DBVersionSchema';
import { DB_VERSION_REPOSITORY } from '../../repositories/interfaces';
import { DBVersionMongooseRepository } from '../../repositories/mongoose/db-version.mongoose.repository';
import { DBVersionTypeOrmRepository } from '../../repositories/typeorm/db-version.typeorm.repository';

import { DatabaseManagerService } from './database-manager.service';
import { MongooseToNewMigrator } from './mongoose-to-newmongoose';
import { MongooseToPostgresMigrator } from './mongoose-to-postgres.migrator';

/**
 * DatabaseManagerModule provides DatabaseManagerService and its dependencies.
 * This module is responsible for database initialization and migrations.
 *
 * IMPORTANT: Other modules that need to wait for database initialization
 * should import this module to ensure proper initialization order.
 * NestJS awaits OnModuleInit for dependencies in import order.
 */
@Global()
@Module({
  imports: [
    AppConfigurationModule,
    MongooseModule.forFeature([{ name: 'DBVersionSchema', schema: DBVersionModel.schema }]),
    TypeOrmModule.forFeature([DBVersionEntity]),
  ],
  providers: [
    DatabaseManagerService,
    MongooseToPostgresMigrator,
    MongooseToNewMigrator,
    DBVersionMongooseRepository,
    DBVersionTypeOrmRepository,
    {
      provide: DB_VERSION_REPOSITORY,
      useFactory: (
        appConfig: AppConfigService,
        pgRepo: DBVersionTypeOrmRepository,
        mongoRepo: DBVersionMongooseRepository,
      ) => (appConfig.usePostgres ? pgRepo : mongoRepo),
      inject: [AppConfigService, DBVersionTypeOrmRepository, DBVersionMongooseRepository],
    },
  ],
  exports: [DatabaseManagerService, MongooseToPostgresMigrator, MongooseToNewMigrator, DB_VERSION_REPOSITORY],
})
export class DatabaseManagerModule {}
