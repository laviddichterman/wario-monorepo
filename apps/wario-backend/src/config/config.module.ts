import { Global, Module } from '@nestjs/common';

import { OrderModule } from '../domain/order/order.module';
import { CatalogModule } from '../infrastructure/database/mongoose/models/catalog/catalog.module';
import { OrdersModule } from '../infrastructure/database/mongoose/models/orders/orders.module';
import { QueryModule } from '../infrastructure/database/mongoose/models/query/query.module';
import { SettingsModule } from '../infrastructure/database/mongoose/models/settings/settings.module';
import { SocketIoService } from '../infrastructure/messaging/socket-io/socket-io.service';
import { PrinterService } from '../infrastructure/printing/printer/printer.service';
import { CatalogProviderModule } from '../modules/catalog-provider/catalog-provider.module';
import { DatabaseManagerModule } from '../modules/database-manager/database-manager.module';
import { IntegrationsModule } from '../modules/integrations/integrations.module';
import { RepositoryModule } from '../repositories/repository.module';

import { AppConfigurationModule } from './app-configuration.module';
import { ErrorNotificationService } from './error-notification/error-notification.service';
import { StoreCreditProviderService } from './store-credit-provider/store-credit-provider.service';

/**
 * ConfigModule is the main application service module.
 *
 * Initialization Order (enforced by module imports):
 * 1. DatabaseManagerModule - DB migrations
 * 2. IntegrationsModule - Square, Google, DataProvider
 * 3. CatalogProviderModule - Catalog loading
 * 4. OrderModule - Order domain services
 * 5. ConfigModule providers - Remaining services
 */
@Global()
@Module({
  imports: [
    // Core initialization chain (order matters!)
    DatabaseManagerModule, // 1. DB migrations
    IntegrationsModule, // 2. Square + Google + DataProvider
    CatalogProviderModule, // 3. Catalog loading (needs Square)

    // Domain modules
    OrderModule, // 4. Order domain services

    // Mongoose schema modules
    OrdersModule,
    CatalogModule,
    QueryModule,
    SettingsModule,

    // Other dependencies
    AppConfigurationModule,
    RepositoryModule,
  ],
  providers: [
    // Infrastructure services
    SocketIoService,
    ErrorNotificationService,
    PrinterService,
    StoreCreditProviderService,
  ],
  exports: [
    // Re-export domain module for consumers
    OrderModule,
    // Re-export infrastructure services
    SocketIoService,
    ErrorNotificationService,
    PrinterService,
    StoreCreditProviderService,
  ],
})
export class ConfigModule { }
