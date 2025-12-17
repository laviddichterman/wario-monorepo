import { Module } from '@nestjs/common';

import { RepositoryModule } from '../../repositories/repository.module';

import { OrderCalendarService } from './order-calendar/order-calendar.service';
import { OrderManagerService } from './order-manager/order-manager.service';
import { OrderNotificationService } from './order-notification/order-notification.service';
import { OrderPaymentService } from './order-payment/order-payment.service';
import { OrderValidationService } from './order-validation/order-validation.service';
import { ThirdPartyOrderService } from './third-party-order/third-party-order.service';

/**
 * OrderModule encapsulates all order-related domain services.
 *
 * This module contains the business logic for:
 * - Order creation, state machine, and lifecycle (OrderManagerService)
 * - Order validation rules (OrderValidationService)
 * - Order notifications/emails (OrderNotificationService)
 * - Payment processing (OrderPaymentService)
 * - Calendar/scheduling logic (OrderCalendarService)
 * - Third-party order ingestion (ThirdPartyOrderService)
 */
@Module({
  imports: [RepositoryModule],
  providers: [
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    ThirdPartyOrderService,
  ],
  exports: [
    OrderCalendarService,
    OrderManagerService,
    OrderNotificationService,
    OrderPaymentService,
    OrderValidationService,
    ThirdPartyOrderService,
  ],
})
export class OrderModule {}
