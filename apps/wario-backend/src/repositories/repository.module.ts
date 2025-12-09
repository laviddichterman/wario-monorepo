import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigService } from '../config/app-config.service';
import { AppConfigurationModule } from '../config/app-configuration.module';
// Entities
import {
  CatalogVersionEntity,
  CategoryEntity,
  OptionEntity,
  OptionTypeEntity,
  OrderInstanceFunctionEntity,
  ProductEntity,
  ProductInstanceEntity,
  ProductInstanceFunctionEntity,
} from '../entities/catalog';
import { OrderEntity, OrderHistoryEntity } from '../entities/order';
import {
  DBVersionEntity,
  FulfillmentEntity,
  KeyValueEntity,
  PrinterGroupEntity,
  SeatingResourceEntity,
  SettingsEntity,
} from '../entities/settings';
import { CatalogModule } from '../models/catalog/catalog.module';
import { OrdersModule } from '../models/orders/orders.module';
import { QueryModule } from '../models/query/query.module';
import { SettingsModule } from '../models/settings/settings.module';

// Interface tokens
import {
  CATEGORY_REPOSITORY,
  DB_VERSION_REPOSITORY,
  FULFILLMENT_REPOSITORY,
  KEY_VALUE_REPOSITORY,
  OPTION_REPOSITORY,
  OPTION_TYPE_REPOSITORY,
  ORDER_INSTANCE_FUNCTION_REPOSITORY,
  ORDER_REPOSITORY,
  PRINTER_GROUP_REPOSITORY,
  PRODUCT_INSTANCE_FUNCTION_REPOSITORY,
  PRODUCT_INSTANCE_REPOSITORY,
  PRODUCT_REPOSITORY,
  SEATING_RESOURCE_REPOSITORY,
  SETTINGS_REPOSITORY,
} from './interfaces';
// Mongoose repositories
import {
  CategoryMongooseRepository,
  DBVersionMongooseRepository,
  FulfillmentMongooseRepository,
  KeyValueMongooseRepository,
  OptionMongooseRepository,
  OptionTypeMongooseRepository,
  OrderInstanceFunctionMongooseRepository,
  OrderMongooseRepository,
  PrinterGroupMongooseRepository,
  ProductInstanceFunctionMongooseRepository,
  ProductInstanceMongooseRepository,
  ProductMongooseRepository,
  SeatingResourceMongooseRepository,
  SettingsMongooseRepository,
} from './mongoose';
// TypeORM repositories
import {
  CategoryTypeOrmRepository,
  DBVersionTypeOrmRepository,
  FulfillmentTypeOrmRepository,
  KeyValueTypeOrmRepository,
  OptionTypeOrmRepository,
  OptionTypeTypeOrmRepository,
  OrderInstanceFunctionTypeOrmRepository,
  OrderTypeOrmRepository,
  PrinterGroupTypeOrmRepository,
  ProductInstanceFunctionTypeOrmRepository,
  ProductInstanceTypeOrmRepository,
  ProductTypeOrmRepository,
  SeatingResourceTypeOrmRepository,
  SettingsTypeOrmRepository,
} from './typeorm';

const entities = [
  CatalogVersionEntity,
  CategoryEntity,
  DBVersionEntity,
  FulfillmentEntity,
  KeyValueEntity,
  OptionEntity,
  OptionTypeEntity,
  OrderEntity,
  OrderHistoryEntity,
  OrderInstanceFunctionEntity,
  PrinterGroupEntity,
  ProductEntity,
  ProductInstanceEntity,
  ProductInstanceFunctionEntity,
  SeatingResourceEntity,
  SettingsEntity,
];

const typeOrmRepos = [
  CategoryTypeOrmRepository,
  DBVersionTypeOrmRepository,
  FulfillmentTypeOrmRepository,
  KeyValueTypeOrmRepository,
  OptionTypeOrmRepository,
  OptionTypeTypeOrmRepository,
  OrderInstanceFunctionTypeOrmRepository,
  OrderTypeOrmRepository,
  PrinterGroupTypeOrmRepository,
  ProductInstanceFunctionTypeOrmRepository,
  ProductInstanceTypeOrmRepository,
  ProductTypeOrmRepository,
  SeatingResourceTypeOrmRepository,
  SettingsTypeOrmRepository,
];

const mongooseRepos = [
  CategoryMongooseRepository,
  DBVersionMongooseRepository,
  FulfillmentMongooseRepository,
  KeyValueMongooseRepository,
  OptionMongooseRepository,
  OptionTypeMongooseRepository,
  OrderInstanceFunctionMongooseRepository,
  OrderMongooseRepository,
  PrinterGroupMongooseRepository,
  ProductInstanceFunctionMongooseRepository,
  ProductInstanceMongooseRepository,
  ProductMongooseRepository,
  SeatingResourceMongooseRepository,
  SettingsMongooseRepository,
];

/**
 * Repository module with factory providers for dual-database support.
 * When USE_POSTGRES is enabled, TypeORM repos are used.
 * Otherwise, Mongoose repos are used.
 */
@Module({
  imports: [
    AppConfigurationModule,
    TypeOrmModule.forFeature(entities),
    CatalogModule,
    SettingsModule,
    OrdersModule,
    QueryModule,
  ],
  providers: [
    // Register concrete repos as injectable
    ...typeOrmRepos,
    ...mongooseRepos,

    // Factory providers for interface tokens
    {
      provide: CATEGORY_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: CategoryTypeOrmRepository, mongoRepo: CategoryMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, CategoryTypeOrmRepository, CategoryMongooseRepository],
    },
    {
      provide: DB_VERSION_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: DBVersionTypeOrmRepository, mongoRepo: DBVersionMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, DBVersionTypeOrmRepository, DBVersionMongooseRepository],
    },
    {
      provide: OPTION_TYPE_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: OptionTypeTypeOrmRepository, mongoRepo: OptionTypeMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, OptionTypeTypeOrmRepository, OptionTypeMongooseRepository],
    },
    {
      provide: OPTION_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: OptionTypeOrmRepository, mongoRepo: OptionMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, OptionTypeOrmRepository, OptionMongooseRepository],
    },
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: ProductTypeOrmRepository, mongoRepo: ProductMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, ProductTypeOrmRepository, ProductMongooseRepository],
    },
    {
      provide: PRODUCT_INSTANCE_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: ProductInstanceTypeOrmRepository, mongoRepo: ProductInstanceMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, ProductInstanceTypeOrmRepository, ProductInstanceMongooseRepository],
    },
    {
      provide: ORDER_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: OrderTypeOrmRepository, mongoRepo: OrderMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, OrderTypeOrmRepository, OrderMongooseRepository],
    },
    {
      provide: FULFILLMENT_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: FulfillmentTypeOrmRepository, mongoRepo: FulfillmentMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, FulfillmentTypeOrmRepository, FulfillmentMongooseRepository],
    },
    {
      provide: SETTINGS_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: SettingsTypeOrmRepository, mongoRepo: SettingsMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, SettingsTypeOrmRepository, SettingsMongooseRepository],
    },
    {
      provide: PRODUCT_INSTANCE_FUNCTION_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: ProductInstanceFunctionTypeOrmRepository, mongoRepo: ProductInstanceFunctionMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, ProductInstanceFunctionTypeOrmRepository, ProductInstanceFunctionMongooseRepository],
    },
    {
      provide: ORDER_INSTANCE_FUNCTION_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: OrderInstanceFunctionTypeOrmRepository, mongoRepo: OrderInstanceFunctionMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, OrderInstanceFunctionTypeOrmRepository, OrderInstanceFunctionMongooseRepository],
    },
    {
      provide: KEY_VALUE_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: KeyValueTypeOrmRepository, mongoRepo: KeyValueMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, KeyValueTypeOrmRepository, KeyValueMongooseRepository],
    },
    {
      provide: PRINTER_GROUP_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: PrinterGroupTypeOrmRepository, mongoRepo: PrinterGroupMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, PrinterGroupTypeOrmRepository, PrinterGroupMongooseRepository],
    },
    {
      provide: SEATING_RESOURCE_REPOSITORY,
      useFactory: (appConfig: AppConfigService, pgRepo: SeatingResourceTypeOrmRepository, mongoRepo: SeatingResourceMongooseRepository) =>
        appConfig.usePostgres ? pgRepo : mongoRepo,
      inject: [AppConfigService, SeatingResourceTypeOrmRepository, SeatingResourceMongooseRepository],
    },
  ],
  exports: [
    CATEGORY_REPOSITORY,
    DB_VERSION_REPOSITORY,
    FULFILLMENT_REPOSITORY,
    KEY_VALUE_REPOSITORY,
    OPTION_REPOSITORY,
    OPTION_TYPE_REPOSITORY,
    ORDER_INSTANCE_FUNCTION_REPOSITORY,
    ORDER_REPOSITORY,
    PRINTER_GROUP_REPOSITORY,
    PRODUCT_INSTANCE_FUNCTION_REPOSITORY,
    PRODUCT_INSTANCE_REPOSITORY,
    PRODUCT_REPOSITORY,
    SEATING_RESOURCE_REPOSITORY,
    SETTINGS_REPOSITORY,
  ],
})
export class RepositoryModule {}
