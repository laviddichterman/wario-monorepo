import * as crypto from 'crypto';

import { UTCDate } from '@date-fns/utc';
import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
import { calendar_v3 } from 'googleapis';
import { FilterQuery, Model } from 'mongoose';
import { Order, Order as SquareOrder } from 'square';

import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  CartByPrinterGroup,
  CategorizedRebuiltCart,
  CoreCartEntry,
  CreateOrderRequestV2,
  CrudOrderResponse,
  CURRENCY,
  CustomerInfoData,
  DateTimeIntervalBuilder,
  DeliveryInfoDto,
  DetermineCartBasedLeadTime,
  DineInInfoDto,
  DiscountMethod,
  EventTitleStringBuilder,
  FulfillmentConfig,
  FulfillmentData,
  FulfillmentTime,
  FulfillmentType,
  GenerateDineInGuestCountString,
  IMoney,
  MoneyToDisplayString,
  OrderLineDiscount,
  OrderPayment,
  OrderPaymentAllocated,
  OrderPaymentProposed,
  PaymentMethod,
  RebuildAndSortCart,
  RecomputeTotals,
  RecomputeTotalsResult,
  ResponseFailure,
  ResponseSuccess,
  ResponseWithStatusCode,
  StoreCreditType,
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
import { SocketIoService } from '../socket-io/socket-io.service';
import {
  BigIntMoneyToIntMoney,
  CreateOrderForMessages,
  CreateOrderFromCart,
  CreateOrdersForPrintingFromCart,
  CreateOrderStoreCreditForRefund,
  GetSquareIdFromExternalIds,
  LineItemsToOrderInstanceCart,
} from '../square-wario-bridge';
import { SquareError, SquareService } from '../square/square.service';
import { StoreCreditProviderService } from '../store-credit-provider/store-credit-provider.service';

const WCP = 'Windy City Pie';

const IL_AREA_CODES = ['217', '309', '312', '630', '331', '618', '708', '773', '815', '779', '847', '224', '872'];
const MI_AREA_CODES = ['231', '248', '269', '313', '517', '586', '616', '734', '810', '906', '947', '989', '679'];

const BTP_AREA_CODES = IL_AREA_CODES.concat(MI_AREA_CODES);
const WCP_AREA_CODES = IL_AREA_CODES;

const IsNativeAreaCode = function (phone: string, area_codes: string[]) {
  const numeric_phone = phone.match(/\d/g)!.join('');
  const area_code = numeric_phone.slice(0, 3);
  return numeric_phone.length == 10 && area_codes.some((x) => x === area_code);
};

const DateTimeIntervalToDisplayServiceInterval = (interval: Interval) => {
  return isSameMinute(interval.start, interval.end)
    ? format(interval.start, WDateUtils.DisplayTimeFormat)
    : `${format(interval.start, WDateUtils.DisplayTimeFormat)} - ${format(interval.end, WDateUtils.DisplayTimeFormat)}`;
};

@Injectable()
export class OrderManagerService implements OnModuleInit {
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
  ) { }

  onModuleInit() {
    this.Bootstrap();
  }

  Bootstrap = () => {
    this.logger.log('Order Manager Bootstrap');

    const _SEND_ORDER_INTERVAL = setInterval(() => {
      void this.SendOrders();
    }, 60000);

    const _CLEAR_OLD_ORDERS_INTERVAL = setInterval(
      () => {
        void this.ClearPastOrders();
      },
      1000 * 60 * 60 * 24,
    ); // every 24 hours

    if (this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P) {
      const _QUERY_3P_ORDERS = setInterval(() => {
        void this.Query3pOrders();
      }, 35000);
      this.logger.log(
        `Set job to query for 3rd Party orders at square location: ${this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P}.`,
      );
    } else {
      this.logger.warn('No value set for SQUARE_LOCATION_3P, skipping polling for 3p orders.');
    }
    this.logger.log('Order Manager Bootstrap completed.');
  };

  // Helper methods (private)
  private CreateExternalConfirmationEmail = async (order: WOrderInstance) => {
    const NOTE_PREPAID =
      "You've already paid, so unless there's an issue with the order or you need to add something, there's no need to handle payment from this point forward.";
    const STORE_NAME = this.dataProvider.KeyValueConfig.STORE_NAME;
    const STORE_ADDRESS = this.dataProvider.KeyValueConfig.STORE_ADDRESS;
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;

    const fulfillmentConfig = this.dataProvider.Fulfillments[order.fulfillment.selectedService];
    const dateTimeInterval = DateTimeIntervalBuilder(order.fulfillment, fulfillmentConfig.maxDuration);
    const display_time = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
    const customer_name = [order.customerInfo.givenName, order.customerInfo.familyName].join(' ');
    const service_title = this.ServiceTitleBuilder(
      fulfillmentConfig.displayName,
      order.fulfillment,
      customer_name,
      dateTimeInterval,
    );
    const nice_area_code = IsNativeAreaCode(
      order.customerInfo.mobileNum,
      STORE_NAME === WCP ? WCP_AREA_CODES : BTP_AREA_CODES,
    );
    const payment_section = fulfillmentConfig.service === FulfillmentType.DineIn ? NOTE_PREPAID : NOTE_PREPAID;
    const confirm = fulfillmentConfig.messages.CONFIRMATION;
    const where = order.fulfillment.deliveryInfo?.validation?.validated_address ?? STORE_ADDRESS;

    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      order.customerInfo.email,
      service_title,
      EMAIL_ADDRESS,
      `<p>${nice_area_code ? 'Hey, nice area code!' : 'Thanks!'}<br />${confirm} ${display_time} order at ${where}.</p>${fulfillmentConfig.messages.INSTRUCTIONS} ${payment_section}`,
    );
  };

  private CreateExternalCancelationEmail = async (order: WOrderInstance, message: string) => {
    const STORE_NAME = this.dataProvider.KeyValueConfig.STORE_NAME;
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;

    const fulfillmentConfig = this.dataProvider.Fulfillments[order.fulfillment.selectedService];
    const dateTimeInterval = DateTimeIntervalBuilder(order.fulfillment, fulfillmentConfig.maxDuration);
    const display_time = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
    const customer_name = [order.customerInfo.givenName, order.customerInfo.familyName].join(' ');
    const service_title = this.ServiceTitleBuilder(
      fulfillmentConfig.displayName,
      order.fulfillment,
      customer_name,
      dateTimeInterval,
    );

    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      order.customerInfo.email,
      service_title,
      EMAIL_ADDRESS,
      `${message ? `<p>${message}</p>` : ''}<br />${customer_name},<br />This message serves to inform you that we've canceled your order previously scheduled for ${display_time}. We hope to see you again in the near future!`,
    );
  };

  private IssueRefundCreditForOrder = async (
    squareOrder: SquareOrder,
    customerInfo: CustomerInfoData,
    amount: IMoney,
  ): Promise<
    | ({ success: true } & { [k: string]: unknown })
    | {
      success: false;
      result: null;
      error: SquareError[];
    }
  > => {
    let undoPaymentResponse:
      | ({ success: true } & { [k: string]: unknown })
      | {
        success: false;
        result: null;
        error: SquareError[];
      };
    // refund to store credit
    const create_order_store_credit = await this.squareService.CreateOrder(
      CreateOrderStoreCreditForRefund(
        this.dataProvider.KeyValueConfig.SQUARE_LOCATION,
        squareOrder.referenceId as string,
        amount,
        `Refund for order ${squareOrder.id as string} cancellation`,
      ),
    );
    undoPaymentResponse = create_order_store_credit;
    if (create_order_store_credit.success && create_order_store_credit.result.order?.id) {
      const zero_payment = await this.squareService.CreatePayment({
        amount: { currency: CURRENCY.USD, amount: 0 },
        autocomplete: true,
        locationId: create_order_store_credit.result.order.locationId,
        referenceId: '',
        squareOrderId: create_order_store_credit.result.order.id,
        sourceId: 'CASH',
      });
      undoPaymentResponse = zero_payment;
      if (zero_payment.success) {
        const issue_credit_response = await this.storeCreditService.IssueCredit({
          addedBy: 'WARIO',
          amount: amount,
          creditType: StoreCreditType.MONEY,
          reason: `Refund for ${squareOrder.id as string}`,
          expiration: null,
          recipientEmail: customerInfo.email,
          recipientNameFirst: customerInfo.givenName,
          recipientNameLast: customerInfo.familyName,
        });
        undoPaymentResponse =
          issue_credit_response.status === 200
            ? { success: true, result: issue_credit_response, error: [] }
            : {
              success: false,
              result: null,
              error: [
                {
                  category: 'API_ERROR',
                  code: 'INTERNAL_SERVER_ERROR',
                  detail: 'Failed issuing store credit',
                },
              ],
            };
      }
    }
    return undoPaymentResponse;
  };

  private GenerateOrderPaymentDisplay(payment: OrderPayment, isHtml: boolean) {
    const lineBreak = isHtml ? '<br />' : '\n';
    switch (payment.t) {
      case PaymentMethod.Cash:
        return `Received cash payment of ${MoneyToDisplayString(payment.amount, true)}.${lineBreak}`;
      case PaymentMethod.CreditCard:
        if (payment.status === TenderBaseStatus.PROPOSED) {
          return `Received payment of ${MoneyToDisplayString(payment.amount, true)} from credit card`;
        } else {
          return `Received payment of ${MoneyToDisplayString(payment.amount, true)} from credit card ending in ${payment.payment.last4}.
          ${lineBreak}
          ${payment.payment.receiptUrl
              ? isHtml
                ? `<a href="${payment.payment.receiptUrl}">Receipt link</a>${lineBreak}`
                : `Receipt: ${payment.payment.receiptUrl}${lineBreak}`
              : ''
            }`;
        }
      case PaymentMethod.StoreCredit:
        return `Applied store credit value ${MoneyToDisplayString(payment.amount, true)} using code ${payment.payment.code}.${lineBreak}`;
    }
  }

  private GenerateOrderLineDiscountDisplay(discount: OrderLineDiscount, isHtml: boolean) {
    switch (discount.t) {
      case DiscountMethod.CreditCodeAmount:
        return `Applied discount of ${MoneyToDisplayString(discount.discount.amount, true)}, pre-tax. Credit code used: ${discount.discount.code}.${isHtml ? '<br />' : '\n'}`;
      case DiscountMethod.ManualAmount:
        return `Applied discount of ${MoneyToDisplayString(discount.discount.amount, true)}, pre-tax.`;
      case DiscountMethod.ManualPercentage:
        return `Applied ${(discount.discount.percentage * 100).toFixed(2)}% discount, valuing ${MoneyToDisplayString(discount.discount.amount, true)}.`;
    }
  }

  private GeneratePaymentSection = (
    totals: RecomputeTotalsResult,
    discounts: OrderLineDiscount[],
    payments: OrderPayment[],
    isHtml: boolean,
  ) => {
    const tip_amount = MoneyToDisplayString(totals.tipAmount, true);
    const subtotal = MoneyToDisplayString(totals.subtotalAfterDiscount, true);
    const totalAfterTaxBeforeTip = MoneyToDisplayString(
      {
        currency: CURRENCY.USD,
        amount: totals.subtotalAfterDiscount.amount + totals.taxAmount.amount,
      },
      true,
    );
    const total_amount = MoneyToDisplayString(totals.total, true);
    const paymentDisplays = payments
      .map((payment) => this.GenerateOrderPaymentDisplay(payment, isHtml))
      .join(isHtml ? '<br />' : '\n');
    const discountDisplays = discounts
      .map((discount) => this.GenerateOrderLineDiscountDisplay(discount, isHtml))
      .join(isHtml ? '<br />' : '\n');
    return isHtml
      ? `${discountDisplays}
    <p>Pre-tax Amount: <strong>${subtotal}</strong><br />
    Post-tax Amount: <strong>${totalAfterTaxBeforeTip}</strong><br />
    Tip Amount: <strong>${tip_amount}</strong><br /></p>
    <p>Received payment of: <strong>${total_amount}</strong></p>
    ${paymentDisplays}`
      : `${discountDisplays}
    Pre-tax Amount: ${subtotal}
    Post-tax Amount: ${totalAfterTaxBeforeTip}
    Tip Amount: ${tip_amount}
    Received payment of: ${total_amount}
    ${paymentDisplays}`;
  };

  private GenerateDeliverySection = (deliveryInfo: DeliveryInfoDto, ishtml: boolean) => {
    if (!deliveryInfo.validation || !deliveryInfo.validation.validated_address) {
      return '';
    }
    const delivery_unit_info = deliveryInfo.address2 ? `, Unit info: ${deliveryInfo.address2}` : '';
    const delivery_instructions = deliveryInfo.deliveryInstructions
      ? `${ishtml ? '<br />' : '\n'}Delivery Instructions: ${deliveryInfo.deliveryInstructions}`
      : '';
    return `${ishtml ? '<p><strong>' : '\n'}Delivery Address:${ishtml ? '</strong>' : ''} ${deliveryInfo.validation.validated_address}${delivery_unit_info}${delivery_instructions}${ishtml ? '</p>' : ''}`;
  };

  private GenerateDineInSection = (dineInInfo: DineInInfoDto, ishtml: boolean) => {
    return ishtml
      ? `<strong>Party size:</strong> ${dineInInfo.partySize.toString()}<br \>`
      : `Party size: ${dineInInfo.partySize.toString()}\n`;
  };

  private ServiceTitleBuilder = (
    service_option_display_string: string,
    fulfillmentInfo: FulfillmentData,
    customer_name: string,
    service_time_interval: Interval,
  ) => {
    const display_service_time_interval = DateTimeIntervalToDisplayServiceInterval(service_time_interval);
    return `${service_option_display_string} for ${customer_name}${fulfillmentInfo.dineInInfo ? GenerateDineInGuestCountString(fulfillmentInfo.dineInInfo) : ''} on ${format(service_time_interval.start, WDateUtils.ServiceDateDisplayFormat)} at ${display_service_time_interval}`;
  };

  private GenerateDisplayCartStringListFromProducts = (cart: CategorizedRebuiltCart) =>
    Object.values(cart)
      .map((category_cart) => category_cart.map((item) => `${item.quantity.toString()}x: ${item.product.m.name}`))
      .flat(1);

  private GenerateCartTextFromFullCart = (
    cart: CategorizedRebuiltCart,
  ): { category_name: string; products: string[] }[] => {
    const catalogCategories = this.catalogService.Catalog.categories;
    return Object.entries(cart)
      .filter(([_, cart]) => cart.length > 0)
      .map(([catid, category_cart]) => {
        const category_name = catalogCategories[catid].category.name;
        const category_shortcart = {
          category_name: category_name,
          products: category_cart.map((x) => `${x.quantity.toString()}x: ${x.product.m.name}`),
        };
        return category_shortcart;
      });
  };

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

  private CreateExternalEmail = async (order: WOrderInstance, service_title: string, cart: CategorizedRebuiltCart) => {
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
    const STORE_NAME = this.dataProvider.KeyValueConfig.STORE_NAME;
    const ORDER_RESPONSE_PREAMBLE = this.dataProvider.KeyValueConfig.ORDER_RESPONSE_PREAMBLE;
    const LOCATION_INFO = this.dataProvider.KeyValueConfig.LOCATION_INFO;
    const delivery_section = order.fulfillment.deliveryInfo
      ? this.GenerateDeliverySection(order.fulfillment.deliveryInfo, true)
      : '';
    const sections = [
      ...this.GenerateDisplayCartStringListFromProducts(cart),
      ...(order.specialInstructions && order.specialInstructions.length > 0
        ? [`<p><strong>Special Instructions</strong>: ${order.specialInstructions} </p>`]
        : []),
      ...(delivery_section ? [delivery_section] : []),
      ...order.discounts.map((discount) => this.GenerateOrderLineDiscountDisplay(discount, true)),
      ...order.payments.map((payment) => this.GenerateOrderPaymentDisplay(payment, true)),
      ...(delivery_section ? [] : [`<p><strong>Location Information:</strong> We are located ${LOCATION_INFO}</p>`]),
    ];
    const emailbody = `<p>${ORDER_RESPONSE_PREAMBLE}</p>
  <p>Please take some time to ensure the details of your order as they were entered are correct. If the order is fine, there is no need to respond to this message. If you need to make a correction or have a question, please respond to this message as soon as possible.</p>
      
  <b>Order information:</b><br />
  Service: ${service_title}.<br />
  Phone: ${order.customerInfo.mobileNum}<br />
  Order contents:<br />
  ${sections.join('<br />')}
  <br />We thank you for your support!`;
    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      order.customerInfo.email,
      service_title,
      EMAIL_ADDRESS,
      emailbody,
    );
  };

  private CreateExternalEmailForOrderReschedule = async (
    fulfillmentConfig: FulfillmentConfig,
    fulfillmentDto: FulfillmentData,
    customerInfo: Pick<CustomerInfoData, 'email' | 'familyName' | 'givenName'>,
    additionalMessage: string,
  ) => {
    const dateTimeInterval = DateTimeIntervalBuilder(fulfillmentDto, fulfillmentConfig.maxDuration);
    const service_title = this.ServiceTitleBuilder(
      fulfillmentConfig.displayName,
      fulfillmentDto,
      `${customerInfo.givenName} ${customerInfo.familyName}`,
      dateTimeInterval,
    );
    const EMAIL_ADDRESS = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
    const STORE_NAME = this.dataProvider.KeyValueConfig.STORE_NAME;
    const newTimeString = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
    const emailbody = `<p>${customerInfo.givenName},</p> 
    We're letting you know that we've updated your order time.<br />
    The new time is ${newTimeString}.<br />
    ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
    If you have any questions, please feel free to reach out to us by responding to this email${this.dataProvider.Settings.config.LOCATION_PHONE_NUMBER ? ` or via text message at ${this.dataProvider.Settings.config.LOCATION_PHONE_NUMBER as string}` : ''}.`;
    return await this.googleService.SendEmail(
      {
        name: STORE_NAME,
        address: EMAIL_ADDRESS,
      },
      customerInfo.email,
      service_title,
      EMAIL_ADDRESS,
      emailbody,
    );
  };

  private GenerateOrderEventJson = (
    shorthandEventTitle: string,
    order: Pick<WOrderInstance, 'customerInfo' | 'fulfillment' | 'payments' | 'discounts' | 'specialInstructions'>,
    cart: CategorizedRebuiltCart,
    service_time_interval: Interval,
    totals: RecomputeTotalsResult,
  ): calendar_v3.Schema$Event => {
    const shortcart = this.GenerateCartTextFromFullCart(cart);
    const special_instructions_section =
      order.specialInstructions && order.specialInstructions.length > 0
        ? `\nSpecial Instructions: ${order.specialInstructions}`
        : '';
    const payment_section = '\n' + this.GeneratePaymentSection(totals, order.discounts, order.payments, false);
    const delivery_section = order.fulfillment.deliveryInfo
      ? this.GenerateDeliverySection(order.fulfillment.deliveryInfo, false)
      : '';
    const dineInSection = order.fulfillment.dineInInfo
      ? this.GenerateDineInSection(order.fulfillment.dineInInfo, false)
      : '';
    const calendar_details = `${shortcart.map((x) => `${x.category_name}:\n${x.products.join('\n')}`).join('\n')}
  ${dineInSection}
  ph: ${order.customerInfo.mobileNum}
  ${special_instructions_section}${delivery_section}${payment_section}`;

    return {
      summary: shorthandEventTitle,
      location: order.fulfillment.deliveryInfo?.validation?.validated_address ?? '',
      description: calendar_details,
      start: {
        dateTime: formatRFC3339(service_time_interval.start),
        timeZone: process.env.TZ,
      },
      end: {
        dateTime: formatRFC3339(service_time_interval.end),
        timeZone: process.env.TZ,
      },
    };
  };

  private RefundStoreCreditDebits = async (spends: ValidateLockAndSpendSuccess[]) => {
    return Promise.all(
      spends.map(async (x) => {
        this.logger.log(`Refunding ${JSON.stringify(x.entry)} after failed processing.`);
        return this.storeCreditService.CheckAndRefundStoreCredit(x.entry, x.index);
      }),
    );
  };

  private RefundSquarePayments = async (payments: OrderPayment[], reason: string) => {
    return Promise.all(
      payments.flatMap((x) =>
        x.status === TenderBaseStatus.COMPLETED
          ? [this.squareService.RefundPayment(x.processorId, x.amount, reason)]
          : [],
      ),
    );
  };

  private CancelSquarePayments = async (payments: OrderPaymentAllocated[]) => {
    return Promise.all(
      payments.flatMap((x) =>
        x.status === TenderBaseStatus.AUTHORIZED ? [this.squareService.CancelPayment(x.processorId)] : [],
      ),
    );
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

  private ClearPastOrders = async () => {
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

  private Query3pOrders = async () => {
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

  private SendOrders = async () => {
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

      const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];
      const expoPrinters = Object.values(this.catalogService.PrinterGroups).filter((x) => x.isExpo);
      if (expoPrinters.length > 0) {
        const message: string[] = [
          ...Object.values(rebuiltCart)
            .flat()
            .map((x) => `${x.quantity.toString()}x: ${x.product.m.name}`),
          `Move to ${destination}`,
          ...(additionalMessage ? [additionalMessage] : []),
        ];
        const messages = expoPrinters.map((pg) => ({
          squareItemVariationId: GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION')!,
          message: message,
        }));
        const messageOrder = CreateOrderForMessages(
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
          lockedOrder.id,
          eventTitle,
          messages,
          {
            displayName: `MOVE ${eventTitle}`,
            emailAddress: lockedOrder.customerInfo.email,
            phoneNumber: lockedOrder.customerInfo.mobileNum,
            pickupAt: promisedTime.start,
          },
        );
        const messageOrderResponse = await this.squareService.SendMessageOrder(messageOrder);
        if (messageOrderResponse !== false) {
          SQORDER_MSG.push(messageOrderResponse.order!.id!);
        }
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
      const messageOrders = CreateOrdersForPrintingFromCart(
        this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
        lockedOrder.id,
        eventTitle,
        Object.values(rebuiltCart).flat(),
        {
          displayName: `${WDateUtils.MinutesToPrintTime(lockedOrder.fulfillment.selectedTime)} ${eventTitle}`,
          emailAddress: lockedOrder.customerInfo.email,
          phoneNumber: lockedOrder.customerInfo.mobileNum,
          pickupAt: promisedTime.start,
          note: lockedOrder.specialInstructions ?? undefined,
        },
        {
          Catalog: this.catalogService.Catalog,
          ReverseMappings: this.catalogService.ReverseMappings,
          PrinterGroups: this.catalogService.PrinterGroups,
          CatalogSelectors: this.catalogService.CatalogSelectors,
        },
      );

      const SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
      const messageOrderResponses: SquareOrder[] = [];
      for (let i = 0; i < messageOrders.length; ++i) {
        const messageOrderResponse = await this.squareService.SendMessageOrder(messageOrders[i]);
        if (messageOrderResponse !== false) {
          messageOrderResponses.push(messageOrderResponse.order!);
        }
      }
      SQORDER_PRINT.push(...messageOrderResponses.map((x) => x.id!));

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
                undoPaymentResponse = await this.IssueRefundCreditForOrder(
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

      const cancelMessageOrderResponses: SquareOrder[] = [];
      const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];
      const SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
      // * Cancel the printer orders we previously sent if the order's fulfillment is in state SENT
      // then send message on cancelation to relevant printer groups (this might not be necessary any longer)
      // do this here to give the refunds time to process, which hopefully results in the +2 increment in the order version
      if (
        lockedOrder.fulfillment.status === WFulfillmentStatus.SENT ||
        lockedOrder.fulfillment.status === WFulfillmentStatus.PROCESSING
      ) {
        const printOrders: SquareOrder[] = [];
        if (SQORDER_PRINT.length > 0) {
          const batchOrders = await this.squareService.BatchRetrieveOrders(
            this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
            SQORDER_PRINT,
          );
          if (batchOrders.success) {
            printOrders.push(...(batchOrders.result?.orders ?? []));
          }
        }

        for (let pIdx = 0; pIdx < printOrders.length; ++pIdx) {
          if (printOrders[pIdx].state === 'OPEN') {
            const _updateSquareOrderResponse = await this.squareService.OrderUpdate(
              this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
              printOrders[pIdx].id!,
              printOrders[pIdx].version!,
              {
                fulfillments:
                  printOrders[pIdx].fulfillments?.map((x) => ({
                    uid: x.uid,
                    state: 'CANCELED',
                    pickupDetails: {
                      canceledAt: formatRFC3339(Date.now()),
                      cancelReason: reason,
                    },
                  })) ?? [],
              },
              [],
            );
          }
        }
        SQORDER_PRINT.splice(0);

        const promisedTime = DateTimeIntervalBuilder(lockedOrder.fulfillment, fulfillmentConfig.maxDuration);
        const oldPromisedTime = WDateUtils.ComputeServiceDateTime(lockedOrder.fulfillment);
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
        const flatCart = Object.values(rebuiltCart).flat();
        // get mapping from printerGroupId to list CoreCartEntry<WProduct> being adjusted for that pgId
        const messages = Object.entries(
          CartByPrinterGroup(flatCart, this.catalogService.CatalogSelectors.productEntry),
        ).map(([pgId, entries]) => ({
          squareItemVariationId: GetSquareIdFromExternalIds(
            this.catalogService.PrinterGroups[pgId].externalIDs,
            'ITEM_VARIATION',
          )!,
          message: entries.map((x) => `CANCEL ${x.quantity}x:${x.product.m.name}`),
        }));
        // get all dummy message item variations for the printerGroups
        const messageOrder = CreateOrderForMessages(
          this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
          lockedOrder.id,
          eventTitle,
          messages,
          {
            displayName: `CANCEL ${eventTitle}`,
            emailAddress: lockedOrder.customerInfo.email,
            phoneNumber: lockedOrder.customerInfo.mobileNum,
            pickupAt: oldPromisedTime,
            note: `CANCEL ${eventTitle}`,
          },
        );
        const messageOrderResponse = await this.squareService.SendMessageOrder(messageOrder);
        if (messageOrderResponse !== false) {
          cancelMessageOrderResponses.push(messageOrderResponse.order!);
        }
      }
      SQORDER_MSG.push(...cancelMessageOrderResponses.map((x) => x.id!));

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
        await this.CreateExternalCancelationEmail(lockedOrder, reason);
      }

      // delete calendar entry
      const gCalEventId = lockedOrder.metadata.find((x) => x.key === 'GCALEVENT')?.value;
      if (gCalEventId) {
        await this.googleService.DeleteCalendarEvent(gCalEventId);
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
      const updatedOrderEventJson = this.GenerateOrderEventJson(
        eventTitle,
        updatedOrder,
        rebuiltCart,
        dateTimeInterval,
        recomputedTotals,
      );
      await this.googleService.ModifyCalendarEvent(gCalEventId, updatedOrderEventJson);
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
    const flatCart = Object.values(rebuiltCart).flat();

    const SQORDER_MSG = lockedOrder.metadata.find((x) => x.key === 'SQORDER_MSG')?.value?.split(',') ?? [];
    const _SQORDER_PRINT = lockedOrder.metadata.find((x) => x.key === 'SQORDER_PRINT')?.value?.split(',') ?? [];
    const messageOrderResponses: SquareOrder[] = [];
    // * Send message on adjustment to relevant printer groups if the order's fulfillment is in state SENT
    if (
      lockedOrder.fulfillment.status === WFulfillmentStatus.SENT ||
      lockedOrder.fulfillment.status === WFulfillmentStatus.PROCESSING
    ) {
      // get mapping from printerGroupId to list CoreCartEntry<WProduct> being adjusted for that pgId
      const messages = Object.entries(
        CartByPrinterGroup(flatCart, this.catalogService.CatalogSelectors.productEntry),
      ).map(([pgId, entries]) => ({
        squareItemVariationId: GetSquareIdFromExternalIds(
          this.catalogService.PrinterGroups[pgId].externalIDs,
          'ITEM_VARIATION',
        )!,
        message: entries.map((x) => `TIME CHANGE ${x.quantity.toString()}x:${x.product.m.name}`),
      }));
      // get all dummy message item variations for the printerGroups
      const messageOrder = CreateOrderForMessages(
        this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE,
        lockedOrder.id,
        eventTitle,
        messages,
        {
          displayName: `TIME CHANGE ${eventTitle}`,
          emailAddress: lockedOrder.customerInfo.email,
          phoneNumber: lockedOrder.customerInfo.mobileNum,
          pickupAt: oldPromisedTime,
          note: `TIME CHANGE ${eventTitle}`,
        },
      );
      const messageOrderResponse = await this.squareService.SendMessageOrder(messageOrder);
      if (messageOrderResponse !== false) {
        messageOrderResponses.push(messageOrderResponse.order!);
      }
    }
    SQORDER_MSG.push(...messageOrderResponses.map((x) => x.id!));

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
      await this.CreateExternalEmailForOrderReschedule(fulfillmentConfig, fulfillmentDto, lockedOrder.customerInfo, '');
    }

    // adjust calendar event
    const gCalEventId = lockedOrder.metadata.find((x) => x.key === 'GCALEVENT')?.value;
    if (gCalEventId) {
      const dateTimeInterval = DateTimeIntervalBuilder(fulfillmentDto, fulfillmentConfig.maxDuration);
      const updatedOrderEventJson = this.GenerateOrderEventJson(
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
      await this.googleService.ModifyCalendarEvent(gCalEventId, updatedOrderEventJson);
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
    const _emailResponse = await this.CreateExternalConfirmationEmail(lockedOrder);

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
    const eventJson = this.GenerateOrderEventJson(
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
    const calendarResponse = await this.googleService.CreateCalendarEvent(eventJson);

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
    const service_title = this.ServiceTitleBuilder(fulfillmentConfig.displayName, createOrderRequest.fulfillment, customerName, dateTimeInterval);
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
        const calendarEvent = await this.googleService.CreateCalendarEvent(this.GenerateOrderEventJson(
          shorthandEventTitle,
          completedOrderInstance,
          rebuiltCart,
          dateTimeInterval,
          recomputedTotals));

        const savedOrder = (await new this.orderModel({
          ...completedOrderInstance,
          metadata: [
            { key: 'SQORDER', value: squareOrder.id! },
            ...(calendarEvent ? [{ key: 'GCALEVENT', value: calendarEvent.id }] : [])
          ]
        }).save()).toObject();
        this.logger.log(`Successfully saved OrderInstance to database: ${JSON.stringify(savedOrder)}`)

        // send email to customer
        const _createExternalEmailInfo = this.CreateExternalEmail(
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
      await this.RefundSquarePayments(sentPayments, 'Refunding failed order');
      await this.CancelSquarePayments(sentPayments);
      await this.RefundStoreCreditDebits(storeCreditResponses);
    }
    catch (err: unknown) {
      this.logger.error(`Got error when unwinding the order after failure: ${JSON.stringify(err)}`);
      return { status: 500, success: false, error: errors };
    }
    this.logger.error(`Got error when unwinding the order after failure: ${JSON.stringify(errors)}`);
    return { status: 400, success: false, error: errors };
  }
}