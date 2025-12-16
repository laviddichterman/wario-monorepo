/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as crypto from 'crypto';

import { Inject, Injectable } from '@nestjs/common';
import { format, formatISO, formatRFC3339, Interval, isSameMinute } from 'date-fns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Order, Order as SquareOrder } from 'square';

import {
  CreateOrderRequestV2,
  CrudOrderResponse,
  DateTimeIntervalBuilder,
  DetermineCartBasedLeadTime,
  DiscountMethod,
  EventTitleStringBuilder,
  FulfillmentConfig,
  FulfillmentData,
  FulfillmentTime,
  FulfillmentType,
  GenerateCategoryOrderList,
  ICategory,
  Metrics,
  MoneyToDisplayString,
  OrderLineDiscount,
  OrderPaymentAllocated,
  OrderPaymentProposed,
  PaymentMethod,
  RebuildAndSortCart,
  RecomputeTotals,
  ResponseFailure,
  ResponseSuccess,
  ResponseWithStatusCode,
  Selector,
  TenderBaseStatus,
  ValidateLockAndSpendSuccess,
  WDateUtils,
  WError,
  WFulfillmentStatus,
  WOrderInstance,
  WOrderInstancePartial,
  WOrderStatus,
} from '@wcp/wario-shared';

import type { IOrderRepository } from '../../repositories/interfaces';
import { ORDER_REPOSITORY } from '../../repositories/interfaces';
import { AppConfigService } from '../app-config.service';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';
import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';
import { PrinterService } from '../printer/printer.service';
import { CreateOrderFromCart } from '../square-wario-bridge';
import { SquareError, SquareService } from '../square/square.service';
import { StoreCreditProviderService } from '../store-credit-provider/store-credit-provider.service';

const DateTimeIntervalToDisplayServiceInterval = (interval: Interval) => {
  return isSameMinute(interval.start, interval.end)
    ? format(interval.start, WDateUtils.DisplayTimeFormat)
    : `${format(interval.start, WDateUtils.DisplayTimeFormat)} - ${format(interval.end, WDateUtils.DisplayTimeFormat)} `;
};

export const GenerateCategoryOrderMapForOrder = (
  fulfillmentConfig: FulfillmentConfig,
  categorySelector: Selector<ICategory>,
): Record<string, number> => {
  const mainCategoryOrderList = GenerateCategoryOrderList(fulfillmentConfig.orderBaseCategoryId, categorySelector);
  const subCategoryOrderList = fulfillmentConfig.orderSupplementaryCategoryId
    ? GenerateCategoryOrderList(fulfillmentConfig.orderSupplementaryCategoryId, categorySelector)
    : [];
  return Object.fromEntries(
    [...mainCategoryOrderList, ...subCategoryOrderList].map((x, i) => [x, i] as [string, number]),
  );
};

@Injectable()
export class OrderManagerService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private orderRepository: IOrderRepository,

    @Inject(GoogleService) private googleService: GoogleService,
    @Inject(SquareService) private squareService: SquareService,
    @Inject(StoreCreditProviderService) private storeCreditService: StoreCreditProviderService,
    @Inject(CatalogProviderService) private catalogService: CatalogProviderService,
    @Inject(DataProviderService) private dataProvider: DataProviderService,
    @Inject(AppConfigService) private appConfigService: AppConfigService,
    @Inject(OrderNotificationService) private orderNotificationService: OrderNotificationService,
    @Inject(OrderPaymentService) private orderPaymentService: OrderPaymentService,
    @Inject(OrderValidationService) private orderValidationService: OrderValidationService,
    @Inject(OrderCalendarService) private orderCalendarService: OrderCalendarService,
    @Inject(PrinterService) private printerService: PrinterService,
    @InjectPinoLogger(OrderManagerService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Sends orders that are ready for fulfillment.
   * This runs on a scheduled interval from TasksService.
   * Orchestrates locking orders and delegating to PrinterService for actual printing.
   */
  SendOrders = async () => {
    const now = Date.now();
    const endOfRange = this.GetEndOfSendingRange(now);
    const endOfRangeAsFT = WDateUtils.ComputeFulfillmentTime(endOfRange);
    const idempotencyKey = crypto.randomBytes(22).toString('hex');

    // Lock orders ready for fulfillment
    const lockedCount = await this.orderRepository.lockReadyOrders(
      WOrderStatus.CONFIRMED,
      WFulfillmentStatus.PROPOSED,
      endOfRangeAsFT.selectedDate,
      endOfRangeAsFT.selectedTime,
      idempotencyKey,
    );

    if (lockedCount > 0) {
      this.logger.info(`Locked ${String(lockedCount)} orders with service before ${formatISO(endOfRange)}`);
      const lockedOrders = await this.orderRepository.findByLock(idempotencyKey);
      for (const order of lockedOrders) {
        await this.printerService.SendLockedOrder(order as WOrderInstance & Required<{ locked: string }>, true);
      }
    }
  };

  private GetEndOfSendingRange = (now: Date | number): Date => {
    // Orders are sent up to 3 hours before their fulfillment time
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    return new Date(typeof now === 'number' ? now + THREE_HOURS_MS : now.getTime() + THREE_HOURS_MS);
  };

  /**
   * Send a move ticket for a pre-locked order.
   * The order must already be locked before calling this method.
   * @param lockedOrder The order that has been atomically locked
   * @param destination The destination to move the order to
   * @param additionalMessage Additional message for the move ticket
   */
  public SendMoveLockedOrderTicket = async (
    lockedOrder: WOrderInstance & Required<{ locked: string }>,
    destination: string,
    additionalMessage: string,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      {
        lockedOrder: {
          id: lockedOrder.id,
          fulfillment: lockedOrder.fulfillment,
          customerInfo: lockedOrder.customerInfo,
        },
      },
      'Sending move ticket for order',
    );
    try {
      // send order to alternate location
      const fulfillmentConfig = this.dataProvider.getFulfillments()[lockedOrder.fulfillment.selectedService];

      const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
      const rebuiltCart = RebuildAndSortCart(
        lockedOrder.cart,
        this.catalogService.getCatalogSelectors(),
        promisedTime.start,
        fulfillmentConfig.id,
      );

      const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];

      const printResult = await this.printerService.SendMoveTicket(
        lockedOrder,
        rebuiltCart,
        destination,
        additionalMessage,
        fulfillmentConfig,
      );

      if (printResult.success) {
        SQORDER_MSG.push(...printResult.squareOrderIds);
      }

      // update order in DB, release lock
      const updatedOrder = await this.orderRepository.updateWithLock(lockedOrder.id, lockedOrder.locked, {
        locked: null,
        metadata: [
          ...lockedOrder.metadata.filter((x) => !['SQORDER_MSG'].includes(x.key)),
          ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
        ],
      });
      if (!updatedOrder) {
        throw new Error('Failed to find updated order after sending to Square.');
      }
      return {
        success: true as const,
        status: 200,
        result: updatedOrder,
      };
    } catch (error: unknown) {
      const errorDetail = `Caught error when attempting to send move ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)} `;
      this.logger.error({ err: error }, 'Caught error when attempting to send move ticket');
      try {
        await this.orderRepository.releaseLock(lockedOrder.id);
      } catch (err2: unknown) {
        this.logger.error(
          { err: err2 },
          'Got even worse error in attempting to release lock on order we failed to finish send processing',
        );
      }
      return {
        status: 500,
        success: false,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  /**
   * Cancel a pre-locked order.
   * The order must already be locked before calling this method.
   * @param lockedOrder The order that has been atomically locked
   * @param reason The reason for cancellation
   * @param emailCustomer Whether to email the customer about the cancellation
   * @param refundToOriginalPayment Whether to refund to the original payment method
   */
  public CancelLockedOrder = async (
    lockedOrder: WOrderInstance & Required<{ locked: string }>,
    reason: string,
    emailCustomer: boolean,
    refundToOriginalPayment: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      { customerInfo: lockedOrder.customerInfo, orderId: lockedOrder.id },
      'Found order to cancel. lock applied.',
    );
    const errors: WError[] = [];
    try {
      const fulfillmentConfig = this.dataProvider.getFulfillments()[lockedOrder.fulfillment.selectedService];
      const is3pOrder = fulfillmentConfig.service === FulfillmentType.ThirdParty;
      const squareOrderId = lockedOrder.metadata.find((x) => x.key === 'SQORDER')!.value;

      if (!is3pOrder) {
        // refund store credits
        const _discountCreditRefunds = await Promise.all(
          lockedOrder.discounts.flatMap(async (discount) => {
            if (discount.t === DiscountMethod.CreditCodeAmount) {
              const refundedDiscount = await this.storeCreditService.RefundStoreCredit(
                discount.discount.code,
                discount.discount.amount,
                'WARIO',
              );
              return [refundedDiscount];
            }
            return [];
          }),
        );
      }

      // refund payments
      await Promise.all(
        lockedOrder.payments.map(async (payment) => {
          if (payment.t === PaymentMethod.StoreCredit) {
            // refund the credit in the store credit DB
            const creditRefundResponse = await this.storeCreditService.RefundStoreCredit(
              payment.payment.code,
              payment.amount,
              'WARIO',
            );
            if (!creditRefundResponse.success) {
              const errorDetail = `Failed to refund store credit for payment ID: ${payment.processorId}. This generally means that the store credit code is invalid(somehow) or Google sheets is having issues.`;
              this.logger.error(errorDetail);
              // todo: need to figure out how to proceed here
            }
          }
          let undoPaymentResponse:
            | ({ success: true } & { [k: string]: unknown })
            | {
                success: false;
                result: null;
                error: SquareError[];
              };
          if (payment.status === TenderBaseStatus.COMPLETED) {
            if (!refundToOriginalPayment && payment.t === PaymentMethod.CreditCard) {
              // refund to store credit
              const retrieveSquareOrderResponse = await this.squareService.RetrieveOrder(squareOrderId);
              if (retrieveSquareOrderResponse.success) {
                undoPaymentResponse = await this.orderPaymentService.IssueRefundCreditForOrder(
                  retrieveSquareOrderResponse.result.order as Order,
                  lockedOrder.customerInfo,
                  payment.amount,
                );
              } else {
                undoPaymentResponse = {
                  success: false,
                  result: null,
                  error: retrieveSquareOrderResponse.error,
                };
              }
            } else {
              undoPaymentResponse = await this.squareService.RefundPayment(payment.processorId, payment.amount, reason);
            }
          } else {
            undoPaymentResponse = await this.squareService.CancelPayment(payment.processorId);
          }
          if (!undoPaymentResponse.success) {
            const errorDetail = `Failed to process payment refund for payment ID: ${payment.processorId} `;
            this.logger.error(errorDetail);
            undoPaymentResponse.error.map((e) =>
              errors.push({
                category: e.category,
                code: e.code,
                detail: e.detail ?? '',
              }),
            );
          }
          return undoPaymentResponse;
        }),
      );
      if (errors.length > 0) {
        // maybe this should result in some more sophisticated cleanup, but we haven't seen a failure here yet
        this.logger.error('Got errors when refunding payments. Sending email to the big giant head');
        void this.googleService.SendEmail(
          this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS,
          {
            name: this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS,
            address: 'dave@windycitypie.com',
          },
          'ERROR IN REFUND PROCESSING. CONTACT DAVE IMMEDIATELY',
          'dave@windycitypie.com',
          `< p > Errors: ${JSON.stringify(errors)} </p>`,
        );
      }

      const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];
      const SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
      // * Cancel the printer orders we previously sent if the order's fulfillment is in state SENT
      // then send message on cancelation to relevant printer groups (this might not be necessary any longer)
      // do this here to give the refunds time to process, which hopefully results in the +2 increment in the order version
      if (
        lockedOrder.fulfillment.status === WFulfillmentStatus.SENT ||
        lockedOrder.fulfillment.status === WFulfillmentStatus.PROCESSING
      ) {
        // Cancel existing print orders
        await this.printerService.CancelPrintOrders(SQORDER_PRINT, reason);
        SQORDER_PRINT.splice(0);

        const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
        const rebuiltCart = RebuildAndSortCart(
          lockedOrder.cart,
          this.catalogService.getCatalogSelectors(),
          promisedTime.start,
          fulfillmentConfig.id,
        );

        const printResult = await this.printerService.SendCancelTicket(lockedOrder, rebuiltCart, fulfillmentConfig);

        if (printResult.success) {
          SQORDER_MSG.push(...printResult.squareOrderIds);
        }
      }

      // lookup Square Order for payments and version number
      const retrieveSquareOrderResponse = await this.squareService.RetrieveOrder(squareOrderId);
      if (!retrieveSquareOrderResponse.success) {
        // unable to find the order
        retrieveSquareOrderResponse.error.map((e) =>
          errors.push({
            category: e.category,
            code: e.code,
            detail: e.detail ?? '',
          }),
        );
        return { status: 404, success: false, error: errors };
      }

      const squareOrder = retrieveSquareOrderResponse.result.order as Order;
      const orderVersion = squareOrder.version as number;

      // cancel square fulfillment(s) and the order if it's not paid
      if (squareOrder.state === 'OPEN') {
        const updateSquareOrderResponse = await this.squareService.OrderUpdate(
          this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
          squareOrderId,
          orderVersion,
          {
            ...(lockedOrder.status === WOrderStatus.OPEN ? { state: 'CANCELED' } : {}),
            fulfillments:
              squareOrder.fulfillments?.map((x) => ({
                uid: x.uid,
                state: 'CANCELED',
              })) ?? [],
          },
          [],
        );
        if (!updateSquareOrderResponse.success) {
          updateSquareOrderResponse.error.map((e) =>
            errors.push({
              category: e.category,
              code: e.code,
              detail: e.detail ?? '',
            }),
          );
          return { status: 500, success: false, error: errors };
        }
      } else {
        // is this an error condition?
      }

      // send email if we're supposed to
      if (!is3pOrder && emailCustomer) {
        await this.orderNotificationService.CreateExternalCancelationEmail(lockedOrder, reason);
      }

      // delete calendar entry
      const gCalEventId = lockedOrder.metadata.find((x) => x.key === 'GCALEVENT')?.value;
      if (gCalEventId) {
        await this.orderCalendarService.DeleteCalendarEvent(gCalEventId);
      }

      // update order in DB, release lock
      try {
        const updatedOrder = await this.orderRepository.updateWithLock(lockedOrder.id, lockedOrder.locked, {
          locked: null,
          status: WOrderStatus.CANCELED,
          fulfillment: { ...(lockedOrder.fulfillment as FulfillmentData), status: WFulfillmentStatus.CANCELED },
          metadata: [
            ...lockedOrder.metadata.filter((x) => !['SQORDER_PRINT', 'SQORDER_MSG'].includes(x.key)),
            ...(SQORDER_PRINT.length > 0 ? [{ key: 'SQORDER_PRINT', value: SQORDER_PRINT.join(',') }] : []),
            ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
          ],
        });
        if (!updatedOrder) {
          return {
            status: 404,
            success: false,
            error: [
              {
                category: 'API_ERROR',
                code: 'NOT_FOUND',
                detail: 'Order not found',
              },
            ],
          };
        }
        // TODO: free up order slot and unblock time as appropriate
        // this.socketIoService.EmitOrder(updatedOrder); // TODO: Implement EmitOrder in SocketIoService
        return { status: 200, success: true as const, result: updatedOrder };
      } catch (err: unknown) {
        const errorDetail = `Unable to commit update to order to release lock and cancel. Got error: ${JSON.stringify(err, null, 2)}`;
        return {
          status: 500,
          success: false as const,
          error: [
            {
              category: 'API_ERROR',
              code: 'INTERNAL_SERVER_ERROR',
              detail: errorDetail,
            },
          ],
        };
      }
    } catch (error: unknown) {
      const errorDetail = `Caught error when attempting to cancel order: ${JSON.stringify(error, null, 2)}`;
      this.logger.error({ err: error }, 'Caught error when attempting to cancel order');
      return {
        status: 500,
        success: false as const,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  private ModifyLockedOrder = async (
    lockedOrder: WOrderInstance,
    orderUpdate: Partial<
      Pick<WOrderInstance, 'customerInfo' | 'cart' | 'discounts' | 'fulfillment' | 'specialInstructions' | 'tip'>
    >,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const updatedOrder = { ...lockedOrder, ...orderUpdate };
    const fulfillmentConfig = this.dataProvider.getFulfillments()[updatedOrder.fulfillment.selectedService];
    const categoryOrderMap = GenerateCategoryOrderMapForOrder(
      fulfillmentConfig,
      this.catalogService.getCatalogSelectors().category,
    );

    const _is3pOrder = fulfillmentConfig.service === FulfillmentType.ThirdParty;
    const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const _oldPromisedTime = WDateUtils.ComputeServiceDateTime(lockedOrder.fulfillment);
    this.logger.info(
      `Adjusting order in status: ${lockedOrder.status} with fulfillment status ${lockedOrder.fulfillment.status} to new time of ${format(promisedTime.start, WDateUtils.ISODateTimeNoOffset)}`,
    );
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.getCatalogSelectors(),
      promisedTime.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.getCatalogSelectors(),
      categoryOrderMap,
      fulfillmentConfig,
      customerName,
      lockedOrder.fulfillment,
      rebuiltCart,
      lockedOrder.specialInstructions ?? '',
    );
    const _flatCart = Object.values(rebuiltCart).flat();

    // TODO: this doesn't work as it doesn't properly handle updated discounts or store credit redemptions
    const recomputedTotals = RecomputeTotals({
      cart: rebuiltCart,
      fulfillment: fulfillmentConfig,
      order: updatedOrder,
      payments: updatedOrder.payments,
      discounts: updatedOrder.discounts,
      config: {
        SERVICE_CHARGE: 0,
        AUTOGRAT_THRESHOLD: this.appConfigService.autogratThreshold,
        TAX_RATE: this.dataProvider.getSettings()?.TAX_RATE || 0.1025,
        CATALOG_SELECTORS: this.catalogService.getCatalogSelectors(),
      },
    });

    // adjust calendar event
    const gCalEventId = lockedOrder.metadata.find((x) => x.key === 'GCALEVENT')?.value;
    if (gCalEventId) {
      const dateTimeInterval = DateTimeIntervalBuilder(updatedOrder.fulfillment, fulfillmentConfig.maxDuration);
      const updatedOrderEventJson = this.orderNotificationService.GenerateOrderEventJson(
        eventTitle,
        updatedOrder,
        rebuiltCart,
        dateTimeInterval,
        recomputedTotals,
      );
      await this.orderCalendarService.ModifyCalendarEvent(gCalEventId, updatedOrderEventJson);
    }
    throw Error("This shit doesn't work yet.");

    // // adjust DB event
    // return await this.orderModel
    //   .findOneAndUpdate(
    //     { locked: lockedOrder.locked, _id: lockedOrder.id },
    //     {
    //       ...updatedOrder,
    //       locked: null,
    //     },
    //     { new: true },
    //   )
    //   .then(async (updatedOrder) => {
    //     // return success/failure
    //     // this.socketIoService.EmitOrder(updatedOrder!.toObject()); // TODO: Implement EmitOrder in SocketIoService
    //     return { status: 200, success: true, error: [], result: updatedOrder! };
    //   })
    //   .catch((err: any) => {
    //     const errorDetail = `Unable to commit update to order to release lock and update fulfillment time. Got error: ${JSON.stringify(err, null, 2)}`;
    //     this.logger.error(
    //       { err },
    //       'Unable to commit update to order to release lock and update fulfillment time',
    //     );
    //     return {
    //       status: 500,
    //       success: false,
    //       error: [
    //         {
    //           category: 'API_ERROR',
    //           code: 'INTERNAL_SERVER_ERROR',
    //           detail: errorDetail,
    //         },
    //       ],
    //     };
    //   });
  };

  /**
   * Adjust the fulfillment time of a pre-locked order.
   * The order must already be locked before calling this method.
   * @param lockedOrder The order that has been atomically locked
   * @param newTime The new fulfillment time
   * @param emailCustomer Whether to email the customer about the reschedule
   */
  public AdjustLockedOrderTime = async (
    lockedOrder: WOrderInstance & Required<{ locked: string }>,
    newTime: FulfillmentTime,
    emailCustomer: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const fulfillmentConfig = this.dataProvider.getFulfillments()[lockedOrder.fulfillment.selectedService];
    const categoryOrderMap = GenerateCategoryOrderMapForOrder(
      fulfillmentConfig,
      this.catalogService.getCatalogSelectors().category,
    );
    const is3pOrder = fulfillmentConfig.service === FulfillmentType.ThirdParty;
    const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const oldPromisedTime = WDateUtils.ComputeServiceDateTime(lockedOrder.fulfillment);
    this.logger.info(
      `Adjusting order in status: ${lockedOrder.status} with fulfillment status ${lockedOrder.fulfillment.status} to new time of ${format(promisedTime.start, WDateUtils.ISODateTimeNoOffset)}`,
    );
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.getCatalogSelectors(),
      promisedTime.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.getCatalogSelectors(),
      categoryOrderMap,
      fulfillmentConfig,
      customerName,
      lockedOrder.fulfillment,
      rebuiltCart,
      lockedOrder.specialInstructions ?? '',
    );

    const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];
    const _SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
    // * Send message on adjustment to relevant printer groups if the order's fulfillment is in state SENT
    if (
      lockedOrder.fulfillment.status === WFulfillmentStatus.SENT ||
      lockedOrder.fulfillment.status === WFulfillmentStatus.PROCESSING
    ) {
      const printResult = await this.printerService.SendTimeChangeTicket(
        lockedOrder,
        rebuiltCart,
        fulfillmentConfig,
        oldPromisedTime,
      );

      if (printResult.success) {
        SQORDER_MSG.push(...printResult.squareOrderIds);
      }
    }

    // adjust square fulfillment(s)
    const squareOrderId = lockedOrder.metadata.find((x) => x.key === 'SQORDER')!.value;
    const retrieveSquareOrderResponse = await this.squareService.RetrieveOrder(squareOrderId);
    if (retrieveSquareOrderResponse.success) {
      const squareOrder = retrieveSquareOrderResponse.result.order!;
      const _updateSquareOrderResponse = await this.squareService.OrderUpdate(
        this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
        squareOrderId,
        squareOrder.version!,
        {
          fulfillments:
            squareOrder.fulfillments?.map((x) => ({
              uid: x.uid,
              pickupDetails: { pickupAt: formatRFC3339(newTime.selectedTime) },
            })) ?? [],
        },
        [],
      );
    }

    const fulfillmentDto: FulfillmentData = {
      ...(lockedOrder.fulfillment as FulfillmentData),
      selectedDate: newTime.selectedDate,
      selectedTime: newTime.selectedTime,
    };

    // send email if we're supposed to
    if (!is3pOrder && emailCustomer) {
      await this.orderNotificationService.CreateExternalEmailForOrderReschedule(
        fulfillmentConfig,
        fulfillmentDto,
        lockedOrder.customerInfo,
        '',
      );
    }

    // adjust calendar event
    const gCalEventId = lockedOrder.metadata.find((x) => x.key === 'GCALEVENT')?.value;
    if (gCalEventId) {
      const dateTimeInterval = DateTimeIntervalBuilder(fulfillmentDto, fulfillmentConfig.maxDuration);
      const updatedOrderEventJson = this.orderNotificationService.GenerateOrderEventJson(
        eventTitle,
        lockedOrder,
        rebuiltCart,
        dateTimeInterval,
        RecomputeTotals({
          cart: rebuiltCart,
          fulfillment: fulfillmentConfig,
          order: lockedOrder,
          payments: lockedOrder.payments,
          discounts: lockedOrder.discounts,
          config: {
            SERVICE_CHARGE: 0,
            AUTOGRAT_THRESHOLD: this.appConfigService.autogratThreshold,
            TAX_RATE: this.dataProvider.getSettings()?.TAX_RATE || 0.1035,
            CATALOG_SELECTORS: this.catalogService.getCatalogSelectors(),
          },
        }),
      );
      await this.orderCalendarService.ModifyCalendarEvent(gCalEventId, updatedOrderEventJson);
    }

    // adjust DB event
    try {
      const updatedOrder = await this.orderRepository.updateWithLock(lockedOrder.id, lockedOrder.locked, {
        locked: null,
        fulfillment: fulfillmentDto,
        metadata: [
          ...lockedOrder.metadata.filter((x) => !['SQORDER_MSG'].includes(x.key)),
          ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
        ],
      });
      // this.socketIoService.EmitOrder(updatedOrder!); // TODO: Implement EmitOrder in SocketIoService
      return {
        status: 200,
        success: true as const,
        result: updatedOrder!,
      };
    } catch (err: unknown) {
      const errorDetail = `Unable to commit update to order to release lock and update fulfillment time. Got error: ${JSON.stringify(err, null, 2)}`;
      this.logger.error({ err }, 'Unable to commit update to order to release lock and update fulfillment time');
      return {
        status: 500,
        success: false,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  /**
   * Confirm a pre-locked order.
   * The order must already be locked before calling this method.
   * @param lockedOrder The order that has been atomically locked
   */
  public ConfirmLockedOrder = async (
    lockedOrder: WOrderInstance & Required<{ locked: string }>,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      { customerInfo: lockedOrder.customerInfo, orderId: lockedOrder.id },
      'Found order to confirm. lock applied.',
    );
    // send email
    const _emailResponse = await this.orderNotificationService.CreateExternalConfirmationEmail(lockedOrder);

    // create calendar entry
    const fulfillmentConfig = this.dataProvider.getFulfillments()[lockedOrder.fulfillment.selectedService];
    const categoryOrderMap = GenerateCategoryOrderMapForOrder(
      fulfillmentConfig,
      this.catalogService.getCatalogSelectors().category,
    );
    const dateTimeInterval = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.getCatalogSelectors(),
      dateTimeInterval.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.getCatalogSelectors(),
      categoryOrderMap,
      fulfillmentConfig,
      customerName,
      lockedOrder.fulfillment,
      rebuiltCart,
      lockedOrder.specialInstructions ?? '',
    );
    const eventJson = this.orderNotificationService.GenerateOrderEventJson(
      eventTitle,
      lockedOrder,
      rebuiltCart,
      dateTimeInterval,
      RecomputeTotals({
        cart: rebuiltCart,
        fulfillment: fulfillmentConfig,
        order: lockedOrder,
        payments: lockedOrder.payments,
        discounts: lockedOrder.discounts,
        config: {
          SERVICE_CHARGE: 0,
          AUTOGRAT_THRESHOLD: this.appConfigService.autogratThreshold,
          TAX_RATE: this.dataProvider.getSettings()?.TAX_RATE || 0.1035,
          CATALOG_SELECTORS: this.catalogService.getCatalogSelectors(),
        },
      }),
    );
    const calendarResponse = await this.orderCalendarService.CreateCalendarEvent(eventJson);

    // update order in DB, release lock
    try {
      const updatedOrder = await this.orderRepository.updateWithLock(lockedOrder.id, lockedOrder.locked, {
        locked: null,
        status: WOrderStatus.CONFIRMED,
        metadata: [
          ...lockedOrder.metadata,
          ...(calendarResponse ? [{ key: 'GCALEVENT', value: calendarResponse }] : []),
        ],
      });
      // this.socketIoService.EmitOrder(updatedOrder!); // TODO: Implement EmitOrder in SocketIoService
      return { status: 200, success: true as const, result: updatedOrder! };
    } catch (err: unknown) {
      const errorDetail = `Unable to commit update to order to release lock and confirm. Got error: ${JSON.stringify(err, null, 2)}`;
      this.logger.error({ err }, 'Unable to commit update to order to release lock and confirm');
      return {
        status: 500,
        success: false as const,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  // Public methods
  GetOrder = async (orderId: string): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return {
          status: 404,
          success: false as const,
          error: [
            {
              category: 'INVALID_REQUEST_ERROR',
              code: 'NOT_FOUND',
              detail: 'Order not found',
            },
          ],
        };
      }
      return { status: 200, success: true as const, result: order };
    } catch (err: unknown) {
      const errorDetail = `Unable to find ${orderId}. Got error: ${JSON.stringify(err, null, 2)}`;
      this.logger.error({ err }, `Unable to find ${orderId}`);
      return {
        status: 500,
        success: false as const,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  GetOrders = async ({
    date,
    status,
  }: {
    date: string | null;
    status: WOrderStatus | null;
  }): Promise<ResponseWithStatusCode<ResponseSuccess<WOrderInstance[]> | ResponseFailure>> => {
    try {
      let orders: WOrderInstance[];
      if (date && status) {
        // Both filters - need to filter in memory since we don't have a combined method
        const dateOrders = await this.orderRepository.findByFulfillmentDate(date);
        orders = dateOrders.filter((o) => o.status === status);
      } else if (date) {
        orders = await this.orderRepository.findByFulfillmentDate(date);
      } else if (status) {
        orders = await this.orderRepository.findByStatus(status);
      } else {
        // No filters - return empty for now (or could add findAll method)
        orders = [];
      }
      return {
        status: 200,
        success: true as const,
        result: orders,
      };
    } catch (err: unknown) {
      const errorDetail = `Unable to find orders. Got error: ${JSON.stringify(err, null, 2)}`;
      this.logger.error({ err }, 'Unable to find orders');
      return {
        status: 500,
        success: false as const,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: errorDetail,
          },
        ],
      };
    }
  };

  ObliterateLocks = async (): Promise<ResponseWithStatusCode<ResponseSuccess<string> | ResponseFailure>> => {
    const unlockResult = await this.orderRepository.unlockAll();
    return {
      status: 200,
      success: true as const,
      result: `Unlocked ${unlockResult.toString()} orders.`,
    };
  };

  /**
   * Send a pre-locked order to the printer service.
   * The order must already be locked before calling this method.
   * @param lockedOrder The order that has been atomically locked
   */
  public SendLockedOrder = async (
    lockedOrder: WOrderInstance & Required<{ locked: string }>,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    return this.printerService.SendLockedOrder(lockedOrder, true);
  };

  public CreateOrder = async (
    createOrderRequest: CreateOrderRequestV2,
    ipAddress: string,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const requestTime = Date.now();

    this.logger.debug({ createOrderRequest, ipAddress }, 'Create Order Request');

    // 1. get the fulfillment and other needed constants from the DataProvider, generate a reference ID, quick computations
    if (!Object.hasOwn(this.dataProvider.getFulfillments(), createOrderRequest.fulfillment.selectedService)) {
      return {
        status: 404,
        success: false,
        error: [
          { category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND', detail: 'Fulfillment specified does not exist.' },
        ],
      };
    }
    const fulfillmentConfig = this.dataProvider.getFulfillments()[createOrderRequest.fulfillment.selectedService];
    const categoryOrderMap = GenerateCategoryOrderMapForOrder(
      fulfillmentConfig,
      this.catalogService.getCatalogSelectors().category,
    );
    const STORE_NAME = this.dataProvider.getKeyValueConfig().STORE_NAME;
    const referenceId = requestTime.toString(36).toUpperCase();
    const dateTimeInterval = DateTimeIntervalBuilder(createOrderRequest.fulfillment, fulfillmentConfig.maxDuration);
    const customerName = [createOrderRequest.customerInfo.givenName, createOrderRequest.customerInfo.familyName].join(
      ' ',
    );
    const service_title = this.orderNotificationService.ServiceTitleBuilder(
      fulfillmentConfig.displayName,
      createOrderRequest.fulfillment,
      customerName,
      dateTimeInterval,
    );
    // 2. Rebuild the order from the menu/catalog
    const { noLongerAvailable, rebuiltCart } = this.orderValidationService.RebuildOrderState(
      createOrderRequest.cart,
      dateTimeInterval.start,
      fulfillmentConfig,
    );
    if (noLongerAvailable.length > 0) {
      this.logger.warn(
        { missing: noLongerAvailable.map((x) => x.product.m.name) },
        'Unable to rebuild order from current catalog data',
      );
      return {
        status: 410,
        success: false,
        error: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'GONE',
            detail: 'Unable to rebuild order from current catalog data',
          },
        ],
      };
    }

    const shorthandEventTitle = EventTitleStringBuilder(
      this.catalogService.getCatalogSelectors(),
      categoryOrderMap,
      fulfillmentConfig,
      customerName,
      createOrderRequest.fulfillment,
      rebuiltCart,
      createOrderRequest.specialInstructions ?? '',
    );

    // 3. let's setup the order object reference
    const orderInstance: WOrderInstancePartial = {
      cart: createOrderRequest.cart,
      customerInfo: createOrderRequest.customerInfo,
      fulfillment: {
        dineInInfo: createOrderRequest.fulfillment.dineInInfo ?? undefined,
        deliveryInfo: createOrderRequest.fulfillment.deliveryInfo ?? undefined,
        selectedService: createOrderRequest.fulfillment.selectedService,
        selectedDate: WDateUtils.formatISODate(dateTimeInterval.start), // REFORMAT THE DATE HERE FOR SAFETY
        selectedTime: createOrderRequest.fulfillment.selectedTime,
        status: WFulfillmentStatus.PROPOSED,
      },
      metrics: {
        ...(createOrderRequest.metrics! as Metrics),
        ipAddress,
      },
      tip: createOrderRequest.tip,
      specialInstructions: createOrderRequest.specialInstructions,
    };

    // 3. recompute the totals to ensure everything matches up, and to get some needed computations that we don't want to pass over the wire and blindly trust
    const recomputedTotals = RecomputeTotals({
      cart: rebuiltCart,
      payments: createOrderRequest.proposedPayments,
      discounts: createOrderRequest.proposedDiscounts,
      fulfillment: fulfillmentConfig,
      order: orderInstance,
      config: {
        SERVICE_CHARGE: 0,
        AUTOGRAT_THRESHOLD: this.appConfigService.autogratThreshold,
        TAX_RATE: this.dataProvider.getSettings()?.TAX_RATE ?? 0.1035,
        CATALOG_SELECTORS: this.catalogService.getCatalogSelectors(),
      },
    });
    if (recomputedTotals.balanceAfterPayments.amount > 0) {
      const errorDetail = `Proposed payments yield balance of ${MoneyToDisplayString(recomputedTotals.balanceAfterPayments, true)}.`;
      this.logger.error(errorDetail);
      return {
        status: 500,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: errorDetail }],
      };
    }

    if (recomputedTotals.tipAmount.amount < recomputedTotals.tipMinimum.amount) {
      const errorDetail = `Computed tip below minimum of ${MoneyToDisplayString(recomputedTotals.tipMinimum, true)} vs sent: ${MoneyToDisplayString(recomputedTotals.tipAmount, true)}`;
      this.logger.error(errorDetail);
      return {
        status: 500,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: errorDetail }],
      };
    }

    // 4. check the availability of the requested service date/time
    const cartLeadTime = DetermineCartBasedLeadTime(
      createOrderRequest.cart,
      this.catalogService.getCatalogSelectors().productEntry,
    );
    const availabilityMap = WDateUtils.GetInfoMapForAvailabilityComputation(
      [this.dataProvider.getFulfillments()[createOrderRequest.fulfillment.selectedService]],
      createOrderRequest.fulfillment.selectedDate,
      cartLeadTime,
    );
    const optionsForSelectedDate = WDateUtils.GetOptionsForDate(
      availabilityMap,
      createOrderRequest.fulfillment.selectedDate,
      formatISO(requestTime),
    );
    const foundTimeOptionIndex = optionsForSelectedDate.findIndex(
      (x) => x.value === createOrderRequest.fulfillment.selectedTime,
    );
    if (foundTimeOptionIndex === -1 || optionsForSelectedDate[foundTimeOptionIndex].disabled) {
      const display_time = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
      const errorDetail = `Requested fulfillment (${fulfillmentConfig.displayName}) at ${display_time} is no longer valid. ${optionsForSelectedDate.length > 0 ? `Next available time for date selected is ${WDateUtils.MinutesToPrintTime(optionsForSelectedDate[0].value)}. Please submit the order again.` : 'No times left for selected date.'}`;
      this.logger.error(errorDetail);
      return {
        status: 410,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'GONE', detail: errorDetail }],
      };
    }

    // 5. Everything checks out, start making service calls (payment and order related)
    const errors: WError[] = [];
    let squareOrder: SquareOrder | null = null;
    let squareOrderVersion = 0;
    const discounts: OrderLineDiscount[] = [];
    const sentPayments: OrderPaymentAllocated[] = [];
    const storeCreditResponses: ValidateLockAndSpendSuccess[] = [];
    try {
      // Payment part A: attempt to process discounts
      await Promise.all(
        recomputedTotals.discountApplied.map(async (proposedDiscount) => {
          // unsure if we want to validate the credit even if for some reason the amount allocated is 0
          if (
            proposedDiscount.t === DiscountMethod.CreditCodeAmount /* && proposedDiscount.discount.amount.amount > 0 */
          ) {
            const response = await this.storeCreditService.ValidateLockAndSpend({
              code: proposedDiscount.discount.code,
              amount: proposedDiscount.discount.amount,
              lock: proposedDiscount.discount.lock,
              updatedBy: STORE_NAME,
            });
            if (!response.success) {
              errors.push({
                category: 'INVALID_REQUEST_ERROR',
                code: 'INSUFFICIENT_FUNDS',
                detail: 'Unable to debit store credit.',
              });
              throw errors;
            }
            storeCreditResponses.push(response);
          }
          discounts.push({
            ...proposedDiscount,
            // perhaps status should be APPROVED until the order is actually closed out
            status: TenderBaseStatus.COMPLETED,
          });
        }),
      );

      // Payment Part B: make an order
      const squareOrderResponse = await this.squareService.CreateOrder(
        CreateOrderFromCart(
          this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
          referenceId,
          discounts,
          [{ amount: recomputedTotals.taxAmount }],
          Object.values(rebuiltCart).flat(),
          recomputedTotals.hasBankersRoundingTaxSkew,
          shorthandEventTitle,
          null,
          this.catalogService,
        ),
      );
      if (!squareOrderResponse.success) {
        this.logger.error({ err: squareOrderResponse.error }, 'Failed to create order');
        squareOrderResponse.error.map((e) =>
          errors.push({ category: e.category, code: e.code, detail: e.detail ?? '' }),
        );
        throw errors;
      }

      squareOrder = squareOrderResponse.result.order!;
      squareOrderVersion = squareOrder.version!;
      this.logger.info({ referenceId, squareOrderId: squareOrder.id }, 'Created Square Order');

      // Payment Part C: process payments with payment processor IN ORDER
      // because it needs to be in order, we can't use Promise.all or map
      for (let pIndex = 0; pIndex < recomputedTotals.paymentsApplied.length; ++pIndex) {
        const payment = recomputedTotals.paymentsApplied[pIndex] as OrderPaymentProposed;
        switch (payment.t) {
          case PaymentMethod.CreditCard: {
            const squarePaymentResponse = await this.squareService.CreatePayment({
              locationId: this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
              sourceId: payment.payment.sourceId,
              amount: payment.amount,
              tipAmount: payment.tipAmount,
              referenceId: referenceId,
              squareOrderId: squareOrder.id!,
              autocomplete: false,
            });
            squareOrderVersion += 1;
            if (!squarePaymentResponse.success) {
              const errorDetail = `Failed to process payment: ${JSON.stringify(squarePaymentResponse)}`;
              this.logger.error(errorDetail);
              squarePaymentResponse.error.forEach((e) =>
                errors.push({ category: e.category, code: e.code, detail: e.detail ?? '' }),
              );
              throw errors;
            }
            this.logger.info(
              {
                referenceId,
                squareOrderId: squareOrder.id,
                amount: MoneyToDisplayString(squarePaymentResponse.result.amount, true),
              },
              'Payment successful',
            );
            sentPayments.push(squarePaymentResponse.result);
            break;
          }
          case PaymentMethod.StoreCredit: {
            const response = await this.storeCreditService.ValidateLockAndSpend({
              code: payment.payment.code,
              amount: payment.amount,
              lock: payment.payment.lock,
              updatedBy: STORE_NAME,
            });
            if (!response.success) {
              errors.push({
                category: 'INVALID_REQUEST_ERROR',
                code: 'INSUFFICIENT_FUNDS',
                detail: 'Unable to debit store credit.',
              });
              throw errors;
            }
            storeCreditResponses.push(response);
            const squareMoneyCreditPaymentResponse = await this.squareService.CreatePayment({
              locationId: this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
              sourceId: 'EXTERNAL',
              storeCreditPayment: payment,
              amount: payment.amount,
              tipAmount: payment.tipAmount,
              referenceId: payment.payment.code,
              squareOrderId: squareOrder.id!,
              autocomplete: false,
            });
            squareOrderVersion += 1;
            if (!squareMoneyCreditPaymentResponse.success) {
              const errorDetail = `Failed to process payment: ${JSON.stringify(squareMoneyCreditPaymentResponse)}`;
              this.logger.error(errorDetail);
              squareMoneyCreditPaymentResponse.error.forEach((e) =>
                errors.push({ category: e.category, code: e.code, detail: e.detail ?? '' }),
              );
              throw errors;
            }
            this.logger.info(
              {
                referenceId,
                squareOrderId: squareOrder.id,
                amount: MoneyToDisplayString(squareMoneyCreditPaymentResponse.result.amount, true),
              },
              'Payment successful',
            );
            sentPayments.push(squareMoneyCreditPaymentResponse.result);
            break;
          }
        }
      }

      // THE GOAL YALL
      const completedOrderInstance: Omit<WOrderInstance, 'id' | 'metadata'> = {
        ...orderInstance,
        payments: sentPayments.slice(),
        discounts: discounts.slice(),
        refunds: [],
        taxes: [{ amount: recomputedTotals.taxAmount }],
        status: WOrderStatus.OPEN,
        locked: null,
      };
      // 6. create calendar event
      try {
        const calendarEventId = await this.orderCalendarService.CreateCalendarEvent(
          this.orderNotificationService.GenerateOrderEventJson(
            shorthandEventTitle,
            completedOrderInstance,
            rebuiltCart,
            dateTimeInterval,
            recomputedTotals,
          ),
        );

        const savedOrder = await this.orderRepository.create({
          ...completedOrderInstance,
          metadata: [
            { key: 'SQORDER', value: squareOrder.id! },
            ...(calendarEventId ? [{ key: 'GCALEVENT', value: calendarEventId }] : []),
          ],
        });
        this.logger.info({ savedOrder }, 'Successfully saved OrderInstance to database');

        // send email to customer
        const _createExternalEmailInfo = this.orderNotificationService.CreateExternalEmail(
          savedOrder,
          service_title,
          rebuiltCart,
        );

        //this.socketIoProvider.EmitOrder(savedOrder);

        // success!
        return { status: 200, success: true, result: savedOrder };
      } catch (error: unknown) {
        const errorDetail = `Caught error while saving calendary entry: ${JSON.stringify(error)}`;
        this.logger.error({ err: error }, 'Caught error while saving calendary entry');
        errors.push({ category: 'INTERNAL_SERVER_ERROR', code: 'INTERNAL_SERVER_ERROR', detail: errorDetail });
        throw errors;
      }
    } catch {
      // pass
    }

    // Payment Appendix: if we're here, then we didn't charge the order and we need to back it out.
    try {
      if (squareOrder !== null) {
        await this.squareService.OrderStateChange(
          this.dataProvider.getKeyValueConfig().SQUARE_LOCATION,
          squareOrder.id!,
          squareOrderVersion,
          'CANCELED',
        );
      }
      await this.orderPaymentService.RefundSquarePayments(sentPayments, 'Refunding failed order');
      await this.orderPaymentService.CancelSquarePayments(sentPayments);
      await this.orderPaymentService.RefundStoreCreditDebits(storeCreditResponses);
    } catch (err: unknown) {
      this.logger.error({ err }, 'Got error when unwinding the order after failure');
      return { status: 500, success: false, error: errors };
    }
    this.logger.error({ errors }, 'Got error when unwinding the order after failure');
    return { status: 400, success: false, error: errors };
  };
}
