import { Inject, Injectable } from '@nestjs/common';
import { format, formatRFC3339, Interval, isSameMinute } from 'date-fns';
import { calendar_v3 } from 'googleapis';

import {
  CategorizedRebuiltCart,
  CURRENCY,
  CustomerInfoData,
  DateTimeIntervalBuilder,
  DeliveryInfoDto,
  DineInInfoDto,
  DiscountMethod,
  FulfillmentConfig,
  FulfillmentData,
  FulfillmentType,
  GenerateDineInGuestCountString,
  MoneyToDisplayString,
  OrderLineDiscount,
  OrderPayment,
  PaymentMethod,
  RecomputeTotalsResult,
  TenderBaseStatus,
  WDateUtils,
} from '@wcp/wario-shared';

import { WOrderInstance } from '../../models/orders/WOrderInstance';
import { AppConfigService } from '../app-config.service';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';

const WCP = 'Windy City Pie';

const IL_AREA_CODES = ['217', '309', '312', '630', '331', '618', '708', '773', '815', '779', '847', '224', '872'];
const MI_AREA_CODES = ['231', '248', '269', '313', '517', '586', '616', '734', '810', '906', '947', '989', '679'];

const BTP_AREA_CODES = IL_AREA_CODES.concat(MI_AREA_CODES);
const WCP_AREA_CODES = IL_AREA_CODES;

const IsNativeAreaCode = function (phone: string, area_codes: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
export class OrderNotificationService {
  constructor(
    @Inject(AppConfigService) private readonly appConfig: AppConfigService,
    @Inject(GoogleService) private googleService: GoogleService,
    @Inject(CatalogProviderService) private catalogProviderService: CatalogProviderService,
    @Inject(DataProviderService) private dataProvider: DataProviderService,
  ) {}

  // Public methods

  ServiceTitleBuilder = (
    service_option_display_string: string,
    fulfillmentInfo: FulfillmentData,
    customer_name: string,
    service_time_interval: Interval,
  ) => {
    const display_service_time_interval = DateTimeIntervalToDisplayServiceInterval(service_time_interval);
    return `${service_option_display_string} for ${customer_name}${fulfillmentInfo.dineInInfo ? GenerateDineInGuestCountString(fulfillmentInfo.dineInInfo) : ''} on ${format(service_time_interval.start, WDateUtils.ServiceDateDisplayFormat)} at ${display_service_time_interval}`;
  };

  CreateExternalConfirmationEmail = async (order: WOrderInstance) => {
    const NOTE_PREPAID =
      "You've already paid, so unless there's an issue with the order or you need to add something, there's no need to handle payment from this point forward.";
    const STORE_NAME = this.dataProvider.getKeyValueConfig().STORE_NAME;
    const STORE_ADDRESS = this.dataProvider.getKeyValueConfig().STORE_ADDRESS;
    const EMAIL_ADDRESS = this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS;

    const fulfillmentConfig = this.dataProvider.getFulfillments()[order.fulfillment.selectedService];
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

  CreateExternalCancelationEmail = async (order: WOrderInstance, message: string) => {
    const STORE_NAME = this.dataProvider.getKeyValueConfig().STORE_NAME;
    const EMAIL_ADDRESS = this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS;

    const fulfillmentConfig = this.dataProvider.getFulfillments()[order.fulfillment.selectedService];
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

  CreateExternalEmail = async (order: WOrderInstance, service_title: string, cart: CategorizedRebuiltCart) => {
    const EMAIL_ADDRESS = this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS;
    const STORE_NAME = this.dataProvider.getKeyValueConfig().STORE_NAME;
    const ORDER_RESPONSE_PREAMBLE = this.dataProvider.getKeyValueConfig().ORDER_RESPONSE_PREAMBLE;
    const LOCATION_INFO = this.dataProvider.getKeyValueConfig().LOCATION_INFO;
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

  CreateExternalEmailForOrderReschedule = async (
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
    const EMAIL_ADDRESS = this.dataProvider.getKeyValueConfig().EMAIL_ADDRESS;
    const STORE_NAME = this.dataProvider.getKeyValueConfig().STORE_NAME;
    const newTimeString = DateTimeIntervalToDisplayServiceInterval(dateTimeInterval);
    const locationPhoneNumber = this.dataProvider.getSettings()?.LOCATION_PHONE_NUMBER;
    const emailbody = `<p>${customerInfo.givenName},</p> 
    We're letting you know that we've updated your order time.<br />
    The new time is ${newTimeString}.<br />
    ${additionalMessage ? `<p>${additionalMessage}</p>` : ''}
    If you have any questions, please feel free to reach out to us by responding to this email${locationPhoneNumber ? ` or via text message at ${locationPhoneNumber}` : ''}.`;
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

  GenerateOrderEventJson = (
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
        timeZone: this.appConfig.timezone,
      },
      end: {
        dateTime: formatRFC3339(service_time_interval.end),
        timeZone: this.appConfig.timezone,
      },
    };
  };

  // Display generation helpers

  GenerateOrderPaymentDisplay(payment: OrderPayment, isHtml: boolean) {
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
          ${
            payment.payment.receiptUrl
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

  GenerateOrderLineDiscountDisplay(discount: OrderLineDiscount, isHtml: boolean) {
    switch (discount.t) {
      case DiscountMethod.CreditCodeAmount:
        return `Applied discount of ${MoneyToDisplayString(discount.discount.amount, true)}, pre-tax. Credit code used: ${discount.discount.code}.${isHtml ? '<br />' : '\n'}`;
      case DiscountMethod.ManualAmount:
        return `Applied discount of ${MoneyToDisplayString(discount.discount.amount, true)}, pre-tax.`;
      case DiscountMethod.ManualPercentage:
        return `Applied ${(discount.discount.percentage * 100).toFixed(2)}% discount, valuing ${MoneyToDisplayString(discount.discount.amount, true)}.`;
    }
  }

  GeneratePaymentSection = (
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

  GenerateDeliverySection = (deliveryInfo: DeliveryInfoDto, ishtml: boolean) => {
    if (!deliveryInfo.validation || !deliveryInfo.validation.validated_address) {
      return '';
    }
    const delivery_unit_info = deliveryInfo.address2 ? `, Unit info: ${deliveryInfo.address2}` : '';
    const delivery_instructions = deliveryInfo.deliveryInstructions
      ? `${ishtml ? '<br />' : '\n'}Delivery Instructions: ${deliveryInfo.deliveryInstructions}`
      : '';
    return `${ishtml ? '<p><strong>' : '\n'}Delivery Address:${ishtml ? '</strong>' : ''} ${deliveryInfo.validation.validated_address}${delivery_unit_info}${delivery_instructions}${ishtml ? '</p>' : ''}`;
  };

  GenerateDineInSection = (dineInInfo: DineInInfoDto, ishtml: boolean) => {
    return ishtml
      ? `<strong>Party size:</strong> ${dineInInfo.partySize.toString()}<br \\>`
      : `Party size: ${dineInInfo.partySize.toString()}\n`;
  };

  GenerateDisplayCartStringListFromProducts = (cart: CategorizedRebuiltCart) =>
    Object.values(cart)
      .map((category_cart) => category_cart.map((item) => `${item.quantity.toString()}x: ${item.product.m.name}`))
      .flat(1);

  GenerateCartTextFromFullCart = (cart: CategorizedRebuiltCart): { category_name: string; products: string[] }[] => {
    const catalogCategories = this.catalogProviderService.getCatalog().categories;
    return Object.entries(cart)
      .filter(([_, cart]) => cart.length > 0)
      .map(([catid, category_cart]) => {
        const category_name = catalogCategories[catid].name;
        const category_shortcart = {
          category_name: category_name,
          products: category_cart.map((x) => `${x.quantity.toString()}x: ${x.product.m.name}`),
        };
        return category_shortcart;
      });
  };
}
