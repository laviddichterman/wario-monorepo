import { Global, Module } from '@nestjs/common';

import { CatalogModule } from '../models/catalog/catalog.module';
import { OrdersModule } from '../models/orders/orders.module';
import { QueryModule } from '../models/query/query.module';
import { SettingsModule } from '../models/settings/settings.module';
import { CatalogProviderModule } from '../modules/catalog-provider/catalog-provider.module';
import { DatabaseManagerModule } from '../modules/database-manager/database-manager.module';
import { IntegrationsModule } from '../modules/integrations/integrations.module';
import { RepositoryModule } from '../repositories/repository.module';

import { AppConfigurationModule } from './app-configuration.module';
import { ErrorNotificationService } from './error-notification/error-notification.service';
import { OrderCalendarService } from './order-calendar/order-calendar.service';
import { OrderManagerService } from './order-manager/order-manager.service';
import { OrderNotificationService } from './order-notification/order-notification.service';
import { OrderPaymentService } from './order-payment/order-payment.service';
import { OrderValidationService } from './order-validation/order-validation.service';
import { PrinterService } from './printer/printer.service';
import { SocketIoService } from './socket-io/socket-io.service';
import { StoreCreditProviderService } from './store-credit-provider/store-credit-provider.service';
import { ThirdPartyOrderService } from './third-party-order/third-party-order.service';

/**
 * ConfigModule is the main application service module.
 *
 * Initialization Order (enforced by module imports):
 * 1. DatabaseManagerModule - DB migrations
 * 2. IntegrationsModule - Square, Google, DataProvider
 * 3. CatalogProviderModule - Catalog loading
 * 4. ConfigModule providers - Order services, etc.
 */
@Global()
@Module({
  imports: [
    // Core initialization chain (order matters!)
    DatabaseManagerModule, // 1. DB migrations
    IntegrationsModule, // 2. Square + Google + DataProvider
    CatalogProviderModule, // 3. Catalog loading (needs Square)

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
    // Services that depend on catalog/integrations being ready
    SocketIoService,
    ErrorNotificationService,
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    PrinterService,
    ThirdPartyOrderService,
    StoreCreditProviderService,
  ],
  exports: [
    // Re-export for consumers that import ConfigModule
    SocketIoService,
    ErrorNotificationService,
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    PrinterService,
    ThirdPartyOrderService,
    StoreCreditProviderService,
  ],
})
export class ConfigModule {}
