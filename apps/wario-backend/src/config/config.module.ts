import { Global, Module } from '@nestjs/common';

import { CatalogModule } from '../models/catalog/catalog.module';
import { OrdersModule } from '../models/orders/orders.module';
import { SettingsModule } from '../models/settings/settings.module';

import { CatalogProviderService } from './catalog-provider/catalog-provider.service';
import { DataProviderService } from './data-provider/data-provider.service';
import { DatabaseManagerService } from './database-manager/database-manager.service';
import { GoogleService } from './google/google.service';
import { OrderCalendarService } from './order-calendar/order-calendar.service';
import { OrderManagerService } from './order-manager/order-manager.service';
import { OrderNotificationService } from './order-notification/order-notification.service';
import { OrderPaymentService } from './order-payment/order-payment.service';
import { OrderValidationService } from './order-validation/order-validation.service';
import { PrinterService } from './printer/printer.service';
import { SquareService } from './square/square.service';
import { StoreCreditProviderService } from './store-credit-provider/store-credit-provider.service';
import { ThirdPartyOrderService } from './third-party-order/third-party-order.service';

@Global()
@Module({
  imports: [OrdersModule, CatalogModule, SettingsModule],
  providers: [
    DataProviderService,
    CatalogProviderService,
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    PrinterService,
    ThirdPartyOrderService,
    GoogleService,
    SquareService,
    StoreCreditProviderService,
    DatabaseManagerService,
  ],
  exports: [
    DataProviderService,
    CatalogProviderService,
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    PrinterService,
    ThirdPartyOrderService,
    GoogleService,
    SquareService,
    StoreCreditProviderService,
    DatabaseManagerService,
  ],
})
export class ConfigModule { }

