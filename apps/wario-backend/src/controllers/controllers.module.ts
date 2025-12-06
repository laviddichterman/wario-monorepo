import { Module } from '@nestjs/common';

import { OrdersModule } from '../models/orders/orders.module';

import { AccountingController } from './accounting/accounting.controller';
import { CategoryController } from './category/category.controller';
import { DeliveryAddressController } from './delivery-address/delivery-address.controller';
import { FulfillmentController } from './fulfillment/fulfillment.controller';
import { KeyValueStoreController } from './key-value-store/key-value-store.controller';
import { ModifierController } from './modifier/modifier.controller';
import { OrderController } from './order/order.controller';
import { PrinterGroupController } from './printer-group/printer-group.controller';
import { ProductInstanceFunctionController } from './product-instance-function/product-instance-function.controller';
import { ProductController } from './product/product.controller';
import { SeatingResourceController } from './seating-resource/seating-resource.controller';
import { SettingsController } from './settings/settings.controller';
import { StoreCreditController } from './store-credit/store-credit.controller';

@Module({
  imports: [OrdersModule],
  controllers: [
    OrderController,
    ProductController,
    ModifierController,
    CategoryController,
    FulfillmentController,
    SettingsController,
    StoreCreditController,
    AccountingController,
    DeliveryAddressController,
    KeyValueStoreController,
    ProductInstanceFunctionController,
    PrinterGroupController,
    SeatingResourceController,
  ],
})
export class ControllersModule { }
