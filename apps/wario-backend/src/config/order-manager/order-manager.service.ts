import * as crypto from 'crypto';

import { UTCDate } from '@date-fns/utc';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  addHours,
  format,
  formatISO,
  formatRFC3339,
  Interval,
  isBefore,
  isSameDay,
  isSameMinute,
  subDays,
  subMinutes,
} from 'date-fns';
import { FilterQuery, Model } from 'mongoose';
import { Order, Order as SquareOrder } from 'square';

import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  CoreCartEntry,
  CreateOrderRequestV2,
  CrudOrderResponse,
  CURRENCY,
  DateTimeIntervalBuilder,
  DetermineCartBasedLeadTime,
  DiscountMethod,
  EventTitleStringBuilder,
  FulfillmentData,
  FulfillmentTime,
  FulfillmentType,
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
  TenderBaseStatus,
  ValidateLockAndSpendSuccess,
  WCPProductV2Dto,
  WDateUtils,
  WError,
  WFulfillmentStatus,
  WOrderInstancePartial,
  WOrderStatus,
  WProduct,
} from '@wcp/wario-shared';

import { WOrderInstance, WOrderInstanceDocument } from '../../models/orders/WOrderInstance';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';
import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';
import { PrinterService } from '../printer/printer.service';
import { SocketIoService } from '../socket-io/socket-io.service';
import {
  BigIntMoneyToIntMoney,
  CreateOrderFromCart,
  LineItemsToOrderInstanceCart,
} from '../square-wario-bridge';
import { SquareError, SquareService } from '../square/square.service';
import { StoreCreditProviderService } from '../store-credit-provider/store-credit-provider.service';

const DateTimeIntervalToDisplayServiceInterval = (interval: Interval) => {
  return isSameMinute(interval.start, interval.end)
    ? format(interval.start, WDateUtils.DisplayTimeFormat)
    : `${format(interval.start, WDateUtils.DisplayTimeFormat)} - ${format(interval.end, WDateUtils.DisplayTimeFormat)}`;
};

@Injectable()
export class OrderManagerService {
  private readonly logger = new Logger(OrderManagerService.name);

  constructor(
    @InjectModel('WOrderInstance')
    private orderModel: Model<WOrderInstanceDocument>,
    @Inject(forwardRef(() => GoogleService))
    private googleService: GoogleService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => StoreCreditProviderService))
    private storeCreditService: StoreCreditProviderService,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogService: CatalogProviderService,
    @Inject(forwardRef(() => DataProviderService))
    private dataProvider: DataProviderService,
    @Inject(forwardRef(() => SocketIoService))
    private socketIoService: SocketIoService,
    @Inject(forwardRef(() => OrderNotificationService))
    private orderNotificationService: OrderNotificationService,
    @Inject(forwardRef(() => OrderPaymentService))
    private orderPaymentService: OrderPaymentService,
    @Inject(forwardRef(() => OrderValidationService))
    private orderValidationService: OrderValidationService,
    @Inject(forwardRef(() => OrderCalendarService))
    private orderCalendarService: OrderCalendarService,
    @Inject(forwardRef(() => PrinterService))
    private printerService: PrinterService,
  ) { }

  // Helper methods (private)

  private RebuildOrderState = (
    cart: CoreCartEntry<WCPProductV2Dto>[],
    service_time: Date | number,
    fulfillmentId: string,
  ) => {
    const catalogSelectors = this.catalogService.CatalogSelectors;
    const rebuiltCart = RebuildAndSortCart(cart, catalogSelectors, service_time, fulfillmentId);
    // migrate to CanThisBeOrderedAtThisTimeAndFulfillmentCatalog
    const noLongerAvailable: CoreCartEntry<WProduct>[] = Object.values(rebuiltCart).flatMap((entries) =>
      entries.filter(
        (x) =>
          !CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
            x.product.p.productId,
            x.product.p.modifiers,
            catalogSelectors,
            service_time,
            fulfillmentId,
            true,
          ) || !catalogSelectors.category(x.categoryId),
      ),
    );
    return {
      noLongerAvailable,
      rebuiltCart,
    };
  };

  private GetEndOfSendingRange = (now: Date | number): Date => {
    return addHours(now, 3);
  };

  private Map3pSource = (source: string) => {
    if (source.startsWith('Postmates') || source.startsWith('Uber')) {
      return 'UE';
    }
    return 'DD';
  };

  ClearPastOrders = async () => {
    try {
      const timeSpanAgoEnd = subDays(new UTCDate(), 1);
      const timeSpanAgoStart = subDays(timeSpanAgoEnd, 1);
      this.logger.log(
        `Clearing old orders between ${formatRFC3339(timeSpanAgoStart)} and ${formatRFC3339(timeSpanAgoEnd)}`,
      );
      const locationsToSearch = this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P
        ? [
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P,
        ]
        : [this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE];
      const oldOrdersResults = await this.squareService.SearchOrders(locationsToSearch, {
        filter: {
          dateTimeFilter: {
            updatedAt: { startAt: formatRFC3339(timeSpanAgoStart) },
          },
          stateFilter: { states: ['OPEN'] },
        },
        sort: { sortField: 'UPDATED_AT', sortOrder: 'ASC' },
      });
      if (oldOrdersResults.success) {
        this.logger.log(`Square old order search results found ${oldOrdersResults.result.orders?.length ?? 0} orders`);
        const ordersToComplete = (oldOrdersResults.result.orders ?? []).filter(
          (x) =>
            (x.fulfillments ?? []).length === 1 &&
            isBefore(new UTCDate(x.fulfillments![0].pickupDetails!.pickupAt!), timeSpanAgoEnd),
        );
        for (let i = 0; i < ordersToComplete.length; ++i) {
          const squareOrder = ordersToComplete[i];
          try {
            const orderUpdateResponse = await this.squareService.OrderUpdate(
              squareOrder.locationId,
              squareOrder.id as string,
              squareOrder.version as number,
              {
                state: 'COMPLETED',
                fulfillments: squareOrder.fulfillments?.map((x) => ({
                  uid: x.uid,
                  state: 'COMPLETED',
                })),
              },
              [],
            );
            if (orderUpdateResponse.success) {
              this.logger.debug(`Marked order ${squareOrder.id as string} as completed`);
            }
          } catch (err1: unknown) {
            this.logger.error(
              `Skipping ${squareOrder.id as string} due to error ingesting: ${JSON.stringify(err1, Object.getOwnPropertyNames(err1), 2)}`,
            );
          }
        }
      }
    } catch (err: unknown) {
      const errorDetail = `Got error when attempting to ingest 3p orders: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`;
      this.logger.error(errorDetail);
    }
  };

  Query3pOrders = async () => {
    try {
      const timeSpanAgo = subMinutes(new UTCDate(), 10);
      const recentlyUpdatedOrdersResponse = await this.squareService.SearchOrders(
        [this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P],
        {
          filter: {
            dateTimeFilter: {
              updatedAt: { startAt: formatRFC3339(timeSpanAgo) },
            },
          },
          sort: { sortField: 'UPDATED_AT', sortOrder: 'ASC' },
        },
      );
      if (recentlyUpdatedOrdersResponse.success) {
        const fulfillmentConfig =
          this.dataProvider.Fulfillments[this.dataProvider.KeyValueConfig.THIRD_PARTY_FULFILLMENT];
        const ordersToInspect = (recentlyUpdatedOrdersResponse.result.orders ?? []).filter(
          (x) => x.lineItems && x.lineItems.length > 0 && x.fulfillments?.length === 1,
        );
        const squareOrderIds = ordersToInspect.map((x) => x.id!);
        const found3pOrders = await this.orderModel
          .find({
            'fulfillment.thirdPartyInfo.squareId': { $in: squareOrderIds },
          })
          .exec();
        const ordersToIngest = ordersToInspect.filter(
          (x) => found3pOrders.findIndex((order) => order.fulfillment.thirdPartyInfo!.squareId === x.id!) === -1,
        );
        const orderInstances: Omit<WOrderInstance, 'id'>[] = [];
        ordersToIngest.forEach((squareOrder) => {
          const fulfillmentDetails = squareOrder.fulfillments![0];
          const requestedFulfillmentTime = WDateUtils.ComputeFulfillmentTime(
            new Date(fulfillmentDetails.pickupDetails!.pickupAt!),
          );
          const fulfillmentTimeClampedRounded =
            Math.floor(requestedFulfillmentTime.selectedTime / fulfillmentConfig.timeStep) * fulfillmentConfig.timeStep;
          let adjustedFulfillmentTime = requestedFulfillmentTime.selectedTime;
          const [givenName, familyFirstLetter] = (
            fulfillmentDetails.pickupDetails?.recipient?.displayName ?? 'ABBIE NORMAL'
          ).split(' ');
          try {
            // generate the WARIO cart from the square order
            const cart = LineItemsToOrderInstanceCart(squareOrder.lineItems!, {
              Catalog: this.catalogService.Catalog,
              ReverseMappings: this.catalogService.ReverseMappings,
              PrinterGroups: this.catalogService.PrinterGroups,
              CatalogSelectors: this.catalogService.CatalogSelectors,
            });

            // determine what available time we have for this order
            const cartLeadTime = DetermineCartBasedLeadTime(cart, this.catalogService.CatalogSelectors.productEntry);
            const availabilityMap = WDateUtils.GetInfoMapForAvailabilityComputation(
              [fulfillmentConfig],
              requestedFulfillmentTime.selectedDate,
              cartLeadTime,
            );
            const optionsForSelectedDate = WDateUtils.GetOptionsForDate(
              availabilityMap,
              requestedFulfillmentTime.selectedDate,
              formatISO(Date.now()),
            );
            const foundTimeOptionIndex = optionsForSelectedDate.findIndex(
              (x) => x.value >= fulfillmentTimeClampedRounded,
            );
            if (foundTimeOptionIndex === -1 || optionsForSelectedDate[foundTimeOptionIndex].disabled) {
              const errorDetail = `Requested fulfillment (${fulfillmentConfig.displayName}) at ${WDateUtils.MinutesToPrintTime(requestedFulfillmentTime.selectedTime)} is no longer valid and could not find suitable time. Ignoring WARIO timing and sending order for originally requested time.`;
              this.logger.error(errorDetail);
            } else {
              adjustedFulfillmentTime = optionsForSelectedDate[foundTimeOptionIndex].value;
            }

            orderInstances.push({
              customerInfo: {
                email: this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
                givenName,
                familyName: familyFirstLetter,
                mobileNum: fulfillmentDetails.pickupDetails?.recipient?.phoneNumber ?? '2064864743',
                referral: '',
              },
              discounts: [],
              fulfillment: {
                selectedDate: requestedFulfillmentTime.selectedDate,
                selectedTime: adjustedFulfillmentTime,
                selectedService: this.dataProvider.KeyValueConfig.THIRD_PARTY_FULFILLMENT,
                status: WFulfillmentStatus.PROPOSED,
                thirdPartyInfo: {
                  squareId: squareOrder.id!,
                  source: this.Map3pSource(squareOrder.source?.name ?? ''),
                },
              },
              locked: null,
              metadata: [{ key: 'SQORDER', value: squareOrder.id! }],
              payments:
                squareOrder.tenders?.map(
                  (x): OrderPaymentAllocated => ({
                    t: PaymentMethod.Cash,
                    amount: BigIntMoneyToIntMoney(x.amountMoney!),
                    createdAt: Date.now(),
                    status: TenderBaseStatus.COMPLETED,
                    tipAmount: { amount: 0, currency: CURRENCY.USD },
                    processorId: x.paymentId!,
                    payment: {
                      amountTendered: BigIntMoneyToIntMoney(x.amountMoney!),
                      change: { amount: 0, currency: CURRENCY.USD },
                    },
                  }),
                ) ?? [],
              refunds: [],
              tip: {
                isPercentage: false,
                isSuggestion: false,
                value: { amount: 0, currency: CURRENCY.USD },
              },
              taxes:
                squareOrder.taxes?.map((x) => ({
                  amount: BigIntMoneyToIntMoney(x.appliedMoney!),
                })) ?? [],
              status: WOrderStatus.OPEN,
              cart,
              specialInstructions:
                requestedFulfillmentTime.selectedTime !== adjustedFulfillmentTime
                  ? `ORT: ${WDateUtils.MinutesToPrintTime(requestedFulfillmentTime.selectedTime)}`
                  : undefined,
            });
          } catch {
            this.logger.error(`Skipping ${JSON.stringify(ordersToInspect)} due to error ingesting.`);
          }
        });
        if (orderInstances.length > 0) {
          this.logger.log(`Inserting ${orderInstances.length.toString()} 3p orders... ${JSON.stringify(orderInstances)}`);
          const saveResponse = await this.orderModel.bulkSave(orderInstances.map((x) => new this.orderModel(x)));
          this.logger.log(`Save response for 3p order: ${JSON.stringify(saveResponse)}`);
        }
      }
    } catch (err: unknown) {
      const errorDetail = `Got error when attempting to ingest 3p orders: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`;
      this.logger.error(errorDetail);
    }
  };

  SendOrders = async () => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    const now = Date.now();
    const endOfRange = this.GetEndOfSendingRange(now);
    const isEndRangeSameDay = isSameDay(now, endOfRange);
    const endOfRangeAsFT = WDateUtils.ComputeFulfillmentTime(endOfRange);
    const endOfRangeAsQuery = {
      'fulfillment.selectedDate': endOfRangeAsFT.selectedDate,
      'fulfillment.selectedTime': { $lte: endOfRangeAsFT.selectedTime },
    };
    const timeConstraint = isEndRangeSameDay
      ? endOfRangeAsQuery
      : {
        $or: [{ 'fulfillment.selectedDate': WDateUtils.formatISODate(now) }, endOfRangeAsQuery],
      };
    // logger.debug(`Running SendOrders job for the time constraint: ${JSON.stringify(timeConstraint)}`);
    await this.orderModel
      .updateMany(
        {
          status: WOrderStatus.CONFIRMED,
          locked: null,
          'fulfillment.status': WFulfillmentStatus.PROPOSED,
          ...timeConstraint,
        },
        { locked: idempotencyKey },
      )
      .then(async (updateResult) => {
        if (updateResult.modifiedCount > 0) {
          this.logger.log(`Locked ${updateResult.modifiedCount.toString()} orders with service before ${formatISO(endOfRange)}`);
          await this.orderModel
            .find({
              locked: idempotencyKey,
            })
            .then(async (lockedOrders) => {
              // for loop keeps it sequential / synchronous
              for (let i = 0; i < lockedOrders.length; ++i) {
                await this.SendLockedOrder(lockedOrders[i].toObject(), true);
              }
            });
          return;
        }
      });
  };

  private LockAndActOnOrder = async (
    idempotencyKey: string,
    orderId: string,
    testDbOrder: FilterQuery<WOrderInstance>,
    onSuccess: (order: WOrderInstance) => Promise<ResponseWithStatusCode<CrudOrderResponse>>,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.log(`Received request (nonce: ${idempotencyKey}) attempting to lock Order ID: ${orderId}`);
    return await this.orderModel
      .findOneAndUpdate({ _id: orderId, locked: null, ...testDbOrder }, { locked: idempotencyKey }, { new: true })
      .then(async (order): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
        if (!order) {
          return {
            status: 404,
            success: false,
            error: [
              {
                category: 'INVALID_REQUEST_ERROR',
                code: 'UNEXPECTED_VALUE',
                detail: 'Order not found/locked',
              },
            ],
          };
        }
        return await onSuccess(order.toObject());
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to find ${orderId}. Got error: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`;
        this.logger.error(errorDetail);
        return {
          status: 404,
          success: false,
          error: [
            {
              category: 'INVALID_REQUEST_ERROR',
              code: 'NOT_FOUND',
              detail: errorDetail,
            },
          ],
        };
      });
  };

  private SendMoveLockedOrderTicket = async (
    lockedOrder: WOrderInstance,
    destination: string,
    additionalMessage: string,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      `Sending move ticket for order ${JSON.stringify({ id: lockedOrder.id, fulfillment: lockedOrder.fulfillment, customerInfo: lockedOrder.customerInfo }, null, 2)}.`,
    );
    try {
      // send order to alternate location
      const fulfillmentConfig = this.dataProvider.Fulfillments[lockedOrder.fulfillment.selectedService];
      const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
      const rebuiltCart = RebuildAndSortCart(
        lockedOrder.cart,
        this.catalogService.CatalogSelectors,
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
      return await this.orderModel
        .findOneAndUpdate(
          { locked: lockedOrder.locked, _id: lockedOrder.id },
          {
            locked: null,
            metadata: [
              ...lockedOrder.metadata.filter((x) => !['SQORDER_MSG'].includes(x.key)),
              ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
            ],
          },
          { new: true },
        )
        .then((updatedOrder): ResponseWithStatusCode<ResponseSuccess<WOrderInstance>> => {
          if (!updatedOrder) {
            throw new Error('Failed to find updated order after sending to Square.');
          }
          return {
            success: true as const,
            status: 200,
            result: updatedOrder.toObject(),
          };
        })
        .catch((err: unknown) => {
          throw err;
        });
    } catch (error: unknown) {
      const errorDetail = `Caught error when attempting to send move ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
      try {
        await this.orderModel.findOneAndUpdate({ _id: lockedOrder.id }, { locked: null });
      } catch (err2: unknown) {
        this.logger.error(
          `Got even worse error in attempting to release lock on order we failed to finish send processing: ${JSON.stringify(err2, Object.getOwnPropertyNames(err2), 2)}`,
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

  private SendLockedOrder = async (
    lockedOrder: WOrderInstance,
    releaseLock: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      `Sending order ${JSON.stringify({ id: lockedOrder.id, fulfillment: lockedOrder.fulfillment, customerInfo: lockedOrder.customerInfo }, null, 2)}, lock applied.`,
    );
    try {
      // send order to alternate location
      const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
      const fulfillmentConfig = this.dataProvider.Fulfillments[lockedOrder.fulfillment.selectedService];
      const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
      const rebuiltCart = RebuildAndSortCart(
        lockedOrder.cart,
        this.catalogService.CatalogSelectors,
        promisedTime.start,
        fulfillmentConfig.id,
      );
      const eventTitle = EventTitleStringBuilder(
        this.catalogService.CatalogSelectors,
        fulfillmentConfig,
        customerName,
        lockedOrder.fulfillment,
        rebuiltCart,
        lockedOrder.specialInstructions ?? '',
      );

      const printResult = await this.printerService.SendPrintOrders(
        lockedOrder,
        rebuiltCart,
        eventTitle,
        fulfillmentConfig,
      );

      const SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
      if (printResult.success) {
        SQORDER_PRINT.push(...printResult.squareOrderIds);
      }

      const updatedOrder = {
        ...lockedOrder,
        ...(releaseLock ? { locked: null } : {}),
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          status: WFulfillmentStatus.SENT,
        },
        metadata: [
          ...lockedOrder.metadata.filter((x) => x.key !== 'SQORDER_PRINT' && x.key !== 'SQPAYMENT_PRINT'),
          { key: 'SQORDER_PRINT', value: SQORDER_PRINT.join(',') },
        ],
      };
      // update order in DB, release lock (if requested)
      return await this.orderModel
        .findOneAndUpdate({ locked: lockedOrder.locked, _id: lockedOrder.id }, updatedOrder, { new: true })
        .then((updated): ResponseWithStatusCode<ResponseSuccess<WOrderInstance>> => {
          if (!updated) {
            throw new Error('Failed to find updated order after sending to Square.');
          }
          return { success: true as const, status: 200, result: updated.toObject() };
        })
        .catch((err: unknown) => {
          throw err;
        });
    } catch (error: unknown) {
      const errorDetail = `Caught error when attempting to send order: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
      if (releaseLock) {
        try {
          await this.orderModel.findOneAndUpdate({ _id: lockedOrder.id }, { locked: null });
        } catch (err2: unknown) {
          this.logger.error(
            `Got even worse error in attempting to release lock on order we failed to finish send processing: ${JSON.stringify(err2, Object.getOwnPropertyNames(err2), 2)}`,
          );
        }
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

  private CancelLockedOrder = async (
    lockedOrder: WOrderInstance,
    reason: string,
    emailCustomer: boolean,
    refundToOriginalPayment: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      `Found order to cancel for ${JSON.stringify(lockedOrder.customerInfo, null, 2)}, order ID: ${lockedOrder.id}. lock applied.`,
    );
    const errors: WError[] = [];
    try {
      const fulfillmentConfig = this.dataProvider.Fulfillments[lockedOrder.fulfillment.selectedService];
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
              const errorDetail = `Failed to refund store credit for payment ID: ${payment.processorId}. This generally means that the store credit code is invalid (somehow) or Google sheets is having issues.`;
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
            const errorDetail = `Failed to process payment refund for payment ID: ${payment.processorId}`;
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
          this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
          {
            name: this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
            address: 'dave@windycitypie.com',
          },
          'ERROR IN REFUND PROCESSING. CONTACT DAVE IMMEDIATELY',
          'dave@windycitypie.com',
          `<p>Errors: ${JSON.stringify(errors)}</p>`,
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
          this.catalogService.CatalogSelectors,
          promisedTime.start,
          fulfillmentConfig.id,
        );

        const printResult = await this.printerService.SendCancelTicket(
          lockedOrder,
          rebuiltCart,
          fulfillmentConfig,
        );

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
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
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
      return await this.orderModel
        .findOneAndUpdate(
          { locked: lockedOrder.locked, _id: lockedOrder.id },
          {
            locked: null,
            status: WOrderStatus.CANCELED,
            'fulfillment.status': WFulfillmentStatus.CANCELED,
            metadata: [
              ...lockedOrder.metadata.filter((x) => !['SQORDER_PRINT', 'SQORDER_MSG'].includes(x.key)),
              ...(SQORDER_PRINT.length > 0 ? [{ key: 'SQORDER_PRINT', value: SQORDER_PRINT.join(',') }] : []),
              ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
            ],
            // TODO: need to add refunds to the order too?
          },
          { new: true },
        )
        .then((updatedOrder): ResponseWithStatusCode<CrudOrderResponse> => {
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
          const updatedOrderObject = updatedOrder.toObject();
          // TODO: free up order slot and unblock time as appropriate

          // send notice to subscribers

          // return to caller
          // this.socketIoService.EmitOrder(updatedOrderObject); // TODO: Implement EmitOrder in SocketIoService
          return { status: 200, success: true as const, result: updatedOrderObject };
        })
        .catch((err: unknown) => {
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
        });
    } catch (error: unknown) {
      const errorDetail = `Caught error when attempting to cancel order: ${JSON.stringify(error, null, 2)}`;
      this.logger.error(errorDetail);
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
    const fulfillmentConfig = this.dataProvider.Fulfillments[updatedOrder.fulfillment.selectedService];
    const _is3pOrder = fulfillmentConfig.service === FulfillmentType.ThirdParty;
    const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const _oldPromisedTime = WDateUtils.ComputeServiceDateTime(lockedOrder.fulfillment);
    this.logger.log(
      `Adjusting order in status: ${lockedOrder.status} with fulfillment status ${lockedOrder.fulfillment.status} to new time of ${format(promisedTime.start, WDateUtils.ISODateTimeNoOffset)}`,
    );
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.CatalogSelectors,
      promisedTime.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.CatalogSelectors,
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
        AUTOGRAT_THRESHOLD: (this.dataProvider.Settings.config.AUTOGRAT_THRESHOLD as number) || 5,
        TAX_RATE: (this.dataProvider.Settings.config.TAX_RATE as number) || 0.1025,
        CATALOG_SELECTORS: this.catalogService.CatalogSelectors,
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
    //     this.logger.error(errorDetail);
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

  private AdjustLockedOrderTime = async (
    lockedOrder: WOrderInstance,
    newTime: FulfillmentTime,
    emailCustomer: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const fulfillmentConfig = this.dataProvider.Fulfillments[lockedOrder.fulfillment.selectedService];
    const is3pOrder = fulfillmentConfig.service === FulfillmentType.ThirdParty;
    const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const oldPromisedTime = WDateUtils.ComputeServiceDateTime(lockedOrder.fulfillment);
    this.logger.log(
      `Adjusting order in status: ${lockedOrder.status} with fulfillment status ${lockedOrder.fulfillment.status} to new time of ${format(promisedTime.start, WDateUtils.ISODateTimeNoOffset)}`,
    );
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.CatalogSelectors,
      promisedTime.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.CatalogSelectors,
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
        this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
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
      await this.orderNotificationService.CreateExternalEmailForOrderReschedule(fulfillmentConfig, fulfillmentDto, lockedOrder.customerInfo, '');
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
            AUTOGRAT_THRESHOLD: (this.dataProvider.Settings.config.AUTOGRAT_THRESHOLD as number) || 5,
            TAX_RATE: (this.dataProvider.Settings.config.TAX_RATE as number) || 0.1035,
            CATALOG_SELECTORS: this.catalogService.CatalogSelectors,
          },
        }),
      );
      await this.orderCalendarService.ModifyCalendarEvent(gCalEventId, updatedOrderEventJson);
    }

    // adjust DB event
    return await this.orderModel
      .findOneAndUpdate(
        { locked: lockedOrder.locked, _id: lockedOrder.id },
        {
          locked: null,
          fulfillment: fulfillmentDto,
          metadata: [
            ...lockedOrder.metadata.filter((x) => !['SQORDER_MSG'].includes(x.key)),
            ...(SQORDER_MSG.length > 0 ? [{ key: 'SQORDER_MSG', value: SQORDER_MSG.join(',') }] : []),
          ],
        },
        { new: true },
      )
      .then(async (updatedOrder) => {
        // return success/failure
        // this.socketIoService.EmitOrder(updatedOrder!.toObject()); // TODO: Implement EmitOrder in SocketIoService
        return {
          status: 200,
          success: true,
          error: [],
          result: updatedOrder!.toObject(),
        };
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to commit update to order to release lock and update fulfillment time. Got error: ${JSON.stringify(err, null, 2)}`;
        this.logger.error(errorDetail);
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
      });
  };

  private ConfirmLockedOrder = async (
    lockedOrder: WOrderInstance,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      `Found order to confirm for ${JSON.stringify(lockedOrder.customerInfo, null, 2)}, order ID: ${lockedOrder.id}. lock applied.`,
    );
    // send email
    const _emailResponse = await this.orderNotificationService.CreateExternalConfirmationEmail(lockedOrder);

    // create calendar entry
    const fulfillmentConfig = this.dataProvider.Fulfillments[lockedOrder.fulfillment.selectedService];
    const dateTimeInterval = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
    const customerName = `${lockedOrder.customerInfo.givenName} ${lockedOrder.customerInfo.familyName}`;
    const rebuiltCart = RebuildAndSortCart(
      lockedOrder.cart,
      this.catalogService.CatalogSelectors,
      dateTimeInterval.start,
      fulfillmentConfig.id,
    );
    const eventTitle = EventTitleStringBuilder(
      this.catalogService.CatalogSelectors,
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
          AUTOGRAT_THRESHOLD: (this.dataProvider.Settings.config.AUTOGRAT_THRESHOLD as number),
          TAX_RATE: (this.dataProvider.Settings.config.TAX_RATE as number),
          CATALOG_SELECTORS: this.catalogService.CatalogSelectors,
        },
      }),
    );
    const calendarResponse = await this.orderCalendarService.CreateCalendarEvent(eventJson);

    // update order in DB, release lock
    return await this.orderModel
      .findOneAndUpdate(
        { locked: lockedOrder.locked, _id: lockedOrder.id },
        {
          locked: null,
          status: WOrderStatus.CONFIRMED,
          metadata: [
            ...lockedOrder.metadata,
            ...(calendarResponse ? [{ key: 'GCALEVENT', value: calendarResponse }] : []),
          ],
        },
        { new: true },
      )
      .then((updatedOrder): ResponseWithStatusCode<ResponseSuccess<WOrderInstance>> => {
        const updatedOrderObject = updatedOrder!.toObject();
        // send notice to subscribers
        // this.socketIoService.EmitOrder(updatedOrderObject); // TODO: Implement EmitOrder in SocketIoService
        // return to caller
        return { status: 200, success: true as const, result: updatedOrderObject };
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to commit update to order to release lock and confirm. Got error: ${JSON.stringify(err, null, 2)}`;
        this.logger.error(errorDetail);
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
      });
  };

  // Public methods
  GetOrder = async (orderId: string): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    return await this.orderModel
      .findById(orderId)
      .then((order) => {
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
        return { status: 200, success: true as const, result: order.toObject() };
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to find ${orderId}. Got error: ${JSON.stringify(err, null, 2)}`;
        this.logger.error(errorDetail);
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
      });
  };

  GetOrders = async (query: FilterQuery<WOrderInstance>):
    Promise<ResponseWithStatusCode<(ResponseSuccess<WOrderInstance[]> | ResponseFailure)>> => {
    return await this.orderModel.find(query)
      .then((orders) => {
        return {
          status: 200,
          success: true as const,
          result: orders.map((x) => x.toObject()),
        };
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to find orders. Got error: ${JSON.stringify(err, null, 2)}`;
        this.logger.error(errorDetail);
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
      });
  };

  ObliterateLocks = async (): Promise<ResponseWithStatusCode<ResponseSuccess<string> | ResponseFailure>> => {
    return await this.orderModel
      .updateMany({ locked: { $ne: null } }, { locked: null })
      .then((updateResult) => {
        return {
          status: 200,
          success: true as const,
          result: `Unlocked ${updateResult.modifiedCount.toString()} orders.`,
        };
      })
      .catch((err: unknown) => {
        const errorDetail = `Unable to unlock orders. Got error: ${JSON.stringify(err, null, 2)}`;
        this.logger.error(errorDetail);
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
      });
  };

  SendMoveOrderTicket = async (
    orderId: string,
    destination: string,
    additionalMessage: string,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(
      idempotencyKey,
      orderId,
      { status: { $in: [WOrderStatus.CONFIRMED, WOrderStatus.COMPLETED] } },
      (order) => this.SendMoveLockedOrderTicket(order, destination, additionalMessage),
    );
  };

  SendOrder = async (orderId: string): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(
      idempotencyKey,
      orderId,
      {
        status: WOrderStatus.CONFIRMED,
        'fulfillment.status': WFulfillmentStatus.PROPOSED,
      },
      (order) => this.SendLockedOrder(order, true),
    );
  };

  CancelOrder = async (
    orderId: string,
    reason: string,
    emailCustomer: boolean,
    refundToOriginalPayment: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(idempotencyKey, orderId, { status: { $ne: WOrderStatus.CANCELED } }, (order) =>
      this.CancelLockedOrder(order, reason, emailCustomer, refundToOriginalPayment),
    );
  };

  AdjustOrderTime = async (
    orderId: string,
    newTime: FulfillmentTime,
    emailCustomer: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(idempotencyKey, orderId, { status: { $ne: WOrderStatus.CANCELED } }, (order) =>
      this.AdjustLockedOrderTime(order, newTime, emailCustomer),
    );
  };

  AdjustOrder = async (
    orderId: string,
    orderUpdate: Partial<
      Pick<WOrderInstance, 'customerInfo' | 'cart' | 'discounts' | 'fulfillment' | 'specialInstructions' | 'tip'>
    >,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(idempotencyKey, orderId, { status: { $ne: WOrderStatus.CANCELED } }, (order) =>
      this.ModifyLockedOrder(order, orderUpdate),
    );
  };

  ConfirmOrder = async (orderId: string): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const idempotencyKey = crypto.randomBytes(22).toString('hex');
    return await this.LockAndActOnOrder(idempotencyKey, orderId, { status: WOrderStatus.OPEN }, (order) =>
      this.ConfirmLockedOrder(order),
    );
  };

  public CreateOrder = async (
    createOrderRequest: CreateOrderRequestV2,
    ipAddress: string,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    const requestTime = Date.now();

    this.logger.debug(`From ${ipAddress}, Create Order Request: ${JSON.stringify(createOrderRequest)}`);

    // 1. get the fulfillment and other needed constants from the DataProvider, generate a reference ID, quick computations
    if (!Object.hasOwn(this.dataProvider.Fulfillments, createOrderRequest.fulfillment.selectedService)) {
      return { status: 404, success: false, error: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND', detail: "Fulfillment specified does not exist." }] };
    }
    const fulfillmentConfig = this.dataProvider.Fulfillments[createOrderRequest.fulfillment.selectedService];
    const STORE_NAME = this.dataProvider.KeyValueConfig.STORE_NAME;
    const referenceId = requestTime.toString(36).toUpperCase();
    const dateTimeInterval = DateTimeIntervalBuilder(createOrderRequest.fulfillment, fulfillmentConfig.maxDuration);
    const customerName = [createOrderRequest.customerInfo.givenName, createOrderRequest.customerInfo.familyName].join(" ");
    const service_title = this.orderNotificationService.ServiceTitleBuilder(fulfillmentConfig.displayName, createOrderRequest.fulfillment, customerName, dateTimeInterval);
    // 2. Rebuild the order from the menu/catalog
    const { noLongerAvailable, rebuiltCart } = this.RebuildOrderState(createOrderRequest.cart, dateTimeInterval.start, fulfillmentConfig.id);
    if (noLongerAvailable.length > 0) {
      const errorDetail = `Unable to rebuild order from current catalog data, missing: ${noLongerAvailable.map(x => x.product.m.name).join(', ')}`
      this.logger.warn(errorDetail);
      return {
        status: 410,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'GONE', detail: errorDetail }]
      };
    }

    const shorthandEventTitle = EventTitleStringBuilder(this.catalogService.CatalogSelectors, fulfillmentConfig, customerName, createOrderRequest.fulfillment, rebuiltCart, createOrderRequest.specialInstructions ?? "");

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
        ...createOrderRequest.metrics!,
        ipAddress
      },
      tip: createOrderRequest.tip,
      specialInstructions: createOrderRequest.specialInstructions
    }

    // 3. recompute the totals to ensure everything matches up, and to get some needed computations that we don't want to pass over the wire and blindly trust
    const recomputedTotals = RecomputeTotals({
      cart: rebuiltCart, payments: createOrderRequest.proposedPayments, discounts: createOrderRequest.proposedDiscounts,
      fulfillment: fulfillmentConfig, order: orderInstance, config: {
        SERVICE_CHARGE: 0,
        AUTOGRAT_THRESHOLD: this.dataProvider.Settings.config.AUTOGRAT_THRESHOLD as number ?? 0,
        TAX_RATE: this.dataProvider.Settings.config.TAX_RATE as number ?? .1035,
        CATALOG_SELECTORS: this.catalogService.CatalogSelectors
      }
    });
    if (recomputedTotals.balanceAfterPayments.amount > 0) {
      const errorDetail = `Proposed payments yield balance of ${MoneyToDisplayString(recomputedTotals.balanceAfterPayments, true)}.`;
      this.logger.error(errorDetail)
      return {
        status: 500,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: errorDetail }]
      };
    }

    if (recomputedTotals.tipAmount.amount < recomputedTotals.tipMinimum.amount) {
      const errorDetail = `Computed tip below minimum of ${MoneyToDisplayString(recomputedTotals.tipMinimum, true)} vs sent: ${MoneyToDisplayString(recomputedTotals.tipAmount, true)}`;
      this.logger.error(errorDetail)
      return {
        status: 500,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: errorDetail }]
      };
    }

    // 4. check the availability of the requested service date/time
    const cartLeadTime = DetermineCartBasedLeadTime(createOrderRequest.cart, this.catalogService.CatalogSelectors.productEntry);
    const availabilityMap = WDateUtils.GetInfoMapForAvailabilityComputation([this.dataProvider.Fulfillments[createOrderRequest.fulfillment.selectedService]], createOrderRequest.fulfillment.selectedDate, cartLeadTime);
    const optionsForSelectedDate = WDateUtils.GetOptionsForDate(availabilityMap, createOrderRequest.fulfillment.selectedDate, formatISO(requestTime))
    const foundTimeOptionIndex = optionsForSelectedDate.findIndex(x => x.value === createOrderRequest.fulfillment.selectedTime);
    if (foundTimeOptionIndex === -1 || optionsForSelectedDate[foundTimeOptionIndex].disabled) {
      const display_time = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
      const errorDetail = `Requested fulfillment (${fulfillmentConfig.displayName}) at ${display_time} is no longer valid. ${optionsForSelectedDate.length > 0 ? `Next available time for date selected is ${WDateUtils.MinutesToPrintTime(optionsForSelectedDate[0].value)}. Please submit the order again.` : 'No times left for selected date.'}`;
      this.logger.error(errorDetail)
      return {
        status: 410,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'GONE', detail: errorDetail }]
      };
    }

    // 5. Everything checks out, start making service calls (payment and order related)
    const errors: WError[] = [];
    let squareOrder: SquareOrder | null = null;
    let squareOrderVersion = 0;
    const discounts: OrderLineDiscount[] = []
    const sentPayments: OrderPaymentAllocated[] = [];
    const storeCreditResponses: ValidateLockAndSpendSuccess[] = [];
    try {
      // Payment part A: attempt to process discounts
      await Promise.all(recomputedTotals.discountApplied.map(async (proposedDiscount) => {
        // unsure if we want to validate the credit even if for some reason the amount allocated is 0
        if (proposedDiscount.t === DiscountMethod.CreditCodeAmount /* && proposedDiscount.discount.amount.amount > 0 */) {
          const response = await this.storeCreditService.ValidateLockAndSpend({ code: proposedDiscount.discount.code, amount: proposedDiscount.discount.amount, lock: proposedDiscount.discount.lock, updatedBy: STORE_NAME })
          if (!response.success) {
            errors.push({ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: "Unable to debit store credit." });
            throw errors;
          }
          storeCreditResponses.push(response);
        }
        discounts.push({
          ...proposedDiscount,
          // perhaps status should be APPROVED until the order is actually closed out
          status: TenderBaseStatus.COMPLETED,
        });
      }));

      // Payment Part B: make an order
      const squareOrderResponse = await this.squareService.CreateOrder(
        CreateOrderFromCart(
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
          referenceId,
          discounts,
          [{ amount: recomputedTotals.taxAmount }],
          Object.values(rebuiltCart).flat(),
          recomputedTotals.hasBankersRoundingTaxSkew,
          shorthandEventTitle,
          null,
          this.catalogService
        ));
      if (!squareOrderResponse.success) {
        this.logger.error(`Failed to create order: ${JSON.stringify(squareOrderResponse.error)}`);
        squareOrderResponse.error.map(e => errors.push({ category: e.category, code: e.code, detail: e.detail ?? "" }))
        throw errors;
      }

      squareOrder = squareOrderResponse.result.order!;
      squareOrderVersion = squareOrder.version!;
      this.logger.log(`For internal id ${referenceId} created Square Order ID: ${squareOrder.id!}`);

      // Payment Part C: process payments with payment processor IN ORDER
      // because it needs to be in order, we can't use Promise.all or map
      for (let pIndex = 0; pIndex < recomputedTotals.paymentsApplied.length; ++pIndex) {
        const payment = recomputedTotals.paymentsApplied[pIndex] as OrderPaymentProposed;
        switch (payment.t) {
          case PaymentMethod.CreditCard: {
            const squarePaymentResponse = await this.squareService.CreatePayment({
              locationId: this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
              sourceId: payment.payment.sourceId,
              amount: payment.amount,
              tipAmount: payment.tipAmount,
              referenceId: referenceId,
              squareOrderId: squareOrder.id!,
              autocomplete: false
            });
            squareOrderVersion += 1;
            if (!squarePaymentResponse.success) {
              const errorDetail = `Failed to process payment: ${JSON.stringify(squarePaymentResponse)}`;
              this.logger.error(errorDetail);
              squarePaymentResponse.error.forEach(e => (errors.push({ category: e.category, code: e.code, detail: e.detail ?? "" })));
              throw errors;
            }
            this.logger.log(`For internal id ${referenceId} and Square Order ID: ${squareOrder.id!} payment for ${MoneyToDisplayString(squarePaymentResponse.result.amount, true)} successful.`)
            sentPayments.push(squarePaymentResponse.result);
            break;
          }
          case PaymentMethod.StoreCredit: {
            const response = await this.storeCreditService.ValidateLockAndSpend({ code: payment.payment.code, amount: payment.amount, lock: payment.payment.lock, updatedBy: STORE_NAME })
            if (!response.success) {
              errors.push({ category: 'INVALID_REQUEST_ERROR', code: 'INSUFFICIENT_FUNDS', detail: "Unable to debit store credit." });
              throw errors;
            }
            storeCreditResponses.push(response);
            const squareMoneyCreditPaymentResponse = await this.squareService.CreatePayment({
              locationId: this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
              sourceId: "EXTERNAL",
              storeCreditPayment: payment,
              amount: payment.amount,
              tipAmount: payment.tipAmount,
              referenceId: payment.payment.code,
              squareOrderId: squareOrder.id!,
              autocomplete: false
            });
            squareOrderVersion += 1;
            if (!squareMoneyCreditPaymentResponse.success) {
              const errorDetail = `Failed to process payment: ${JSON.stringify(squareMoneyCreditPaymentResponse)}`;
              this.logger.error(errorDetail);
              squareMoneyCreditPaymentResponse.error.forEach(e => (errors.push({ category: e.category, code: e.code, detail: e.detail ?? "" })));
              throw errors;
            }
            this.logger.log(`For internal id ${referenceId} and Square Order ID: ${squareOrder.id!} payment for ${MoneyToDisplayString(squareMoneyCreditPaymentResponse.result.amount, true)} successful.`)
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
        locked: null
      };
      // 6. create calendar event
      try {
        const calendarEventId = await this.orderCalendarService.CreateCalendarEvent(this.orderNotificationService.GenerateOrderEventJson(
          shorthandEventTitle,
          completedOrderInstance,
          rebuiltCart,
          dateTimeInterval,
          recomputedTotals));

        const savedOrder = (await new this.orderModel({
          ...completedOrderInstance,
          metadata: [
            { key: 'SQORDER', value: squareOrder.id! },
            ...(calendarEventId ? [{ key: 'GCALEVENT', value: calendarEventId }] : [])
          ]
        }).save()).toObject();
        this.logger.log(`Successfully saved OrderInstance to database: ${JSON.stringify(savedOrder)}`)

        // send email to customer
        const _createExternalEmailInfo = this.orderNotificationService.CreateExternalEmail(
          savedOrder,
          service_title,
          rebuiltCart);

        //this.socketIoProvider.EmitOrder(savedOrder);

        // success!
        return { status: 200, success: true, result: savedOrder };

      } catch (error: any) {
        const errorDetail = `Caught error while saving calendary entry: ${JSON.stringify(error)}`;
        this.logger.error(errorDetail);
        errors.push({ category: "INTERNAL_SERVER_ERROR", code: "INTERNAL_SERVER_ERROR", detail: errorDetail });
        throw errors;
      }
    } catch (err: any) {
      // pass
    }

    // Payment Appendix: if we're here, then we didn't charge the order and we need to back it out.
    try {
      if (squareOrder !== null) {
        await this.squareService.OrderStateChange(
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
          squareOrder.id!,
          squareOrderVersion,
          "CANCELED");
      }
      await this.orderPaymentService.RefundSquarePayments(sentPayments, 'Refunding failed order');
      await this.orderPaymentService.CancelSquarePayments(sentPayments);
      await this.orderPaymentService.RefundStoreCreditDebits(storeCreditResponses);
    }
    catch (err: unknown) {
      this.logger.error(`Got error when unwinding the order after failure: ${JSON.stringify(err)}`);
      return { status: 500, success: false, error: errors };
    }
    this.logger.error(`Got error when unwinding the order after failure: ${JSON.stringify(errors)}`);
    return { status: 400, success: false, error: errors };
  }
}