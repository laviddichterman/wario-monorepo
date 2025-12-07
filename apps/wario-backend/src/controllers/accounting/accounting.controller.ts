import { Controller, Get, Query } from '@nestjs/common';
import { addDays, formatRFC3339, parseISO, startOfDay } from 'date-fns';

import {
  CoreCartEntry,
  CreateProductWithMetadataFromV2,
  RoundToTwoDecimalPlaces,
  WDateUtils,
  WOrderStatus,
  WProduct,
} from '@wcp/wario-shared';

import { CatalogProviderService } from '../../config/catalog-provider/catalog-provider.service';
import { GoogleService } from '../../config/google/google.service';
import { OrderManagerService } from '../../config/order-manager/order-manager.service';

const tipsregex = /Tip Amount: \\$([0-9]+(?:\\.[0-9]{1,2})?)/;

type CategorySalesMap = Record<string, { name: string; sum: number; quantity: number }>;
interface ReportAccumulator {
  discount: number;
  categorySales: CategorySalesMap;
  tips: number;
  tax: number;
  tendered: number;
}

@Controller('api/v1/payments')
export class AccountingController {
  constructor(
    private readonly catalogProvider: CatalogProviderService,
    private readonly googleService: GoogleService,
    private readonly orderManager: OrderManagerService,
  ) { }

  @Get('tips')
  async getTips(@Query('date') date: string) {
    const tips_date = startOfDay(parseISO(date));
    const min_date = formatRFC3339(tips_date);
    const max_date = formatRFC3339(addDays(tips_date, 1));
    const events = await this.googleService.GetEventsForDate(min_date, max_date, 'America/Los_Angeles') || [];
    const tips_array: (number | string)[] = [];
    events.map((event) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (event && event.description) {
        const tips_match = event.description.match(tipsregex);
        if (tips_match) {
          tips_array.push(parseFloat(tips_match[1]));
        }
      }
    });
    return tips_array;
  }

  @Get('report')
  async getReport(@Query('date') report_date: string) {
    const ordersResponse = await this.orderManager.GetOrders({
      'fulfillment.selectedDate': { $eq: report_date },
      status: WOrderStatus.CONFIRMED,
    });
    if (!ordersResponse.success) {
      throw new Error('Failed to fetch orders');
    }
    const orders = ordersResponse.result;
    const CategorySalesMapMerger = (
      sales_map: CategorySalesMap,
      cart: CoreCartEntry<WProduct>[],
    ): CategorySalesMap => {
      return cart.reduce((acc, e) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const product = this.catalogProvider.CatalogSelectors.productEntry(e.product.p.productId)!;
        const printerGroupId = product.product.printerGroup;
        const printerGroupName = printerGroupId
          ? this.catalogProvider.PrinterGroups[printerGroupId].name
          : 'No Category';
        const pgIdOrNONE = printerGroupId ?? 'NONE';
        const price = e.quantity * e.product.m.price.amount;
        let existingQuantity = 0;
        let existingSum = 0;
        if (Object.hasOwn(acc, pgIdOrNONE)) {
          const existing = acc[pgIdOrNONE];
          existingQuantity = existing.quantity;
          existingSum = existing.sum;
        }
        return {
          ...acc,
          [pgIdOrNONE]: {
            name: printerGroupName,
            quantity: existingQuantity + e.quantity,
            sum: existingSum + price,
          },
        };
      }, sales_map);
    };
    const report = orders.reduce<ReportAccumulator>(
      (acc, o) => {
        const service_time = WDateUtils.ComputeServiceDateTime(o.fulfillment);
        const order_discount_amount = o.discounts.reduce((inner_acc, d) => inner_acc + d.discount.amount.amount, 0);
        const order_tax_amount = o.taxes.reduce((inner_acc, t) => inner_acc + t.amount.amount, 0);
        const sum_payments = o.payments.reduce(
          (inner_acc, p) => ({
            tip_amount: inner_acc.tip_amount + p.tipAmount.amount,
            payment_amount: inner_acc.payment_amount + p.amount.amount,
          }),
          { tip_amount: 0, payment_amount: 0 },
        );
        const convertedCart: CoreCartEntry<WProduct>[] = o.cart.map((x) => {
          return {
            categoryId: x.categoryId,
            quantity: x.quantity,
            product: CreateProductWithMetadataFromV2(
              x.product,
              this.catalogProvider.CatalogSelectors,
              service_time,
              o.fulfillment.selectedService,
            ),
          };
        });
        return {
          discount: acc.discount + order_discount_amount,
          tax: acc.tax + order_tax_amount,
          categorySales: CategorySalesMapMerger(acc.categorySales, convertedCart),
          tendered: acc.tendered + sum_payments.payment_amount,
          tips: acc.tips + sum_payments.tip_amount,
        } satisfies ReportAccumulator;
      },
      {
        discount: 0,
        categorySales: {},
        tips: 0,
        tax: 0,
        tendered: 0,
      },
    );

    return {
      netSales: RoundToTwoDecimalPlaces(Object.values(report.categorySales).reduce((acc, x) => acc + x.sum, 0) / 100),
      discount: RoundToTwoDecimalPlaces(report.discount / 100),
      categorySales: Object.entries(report.categorySales).reduce<CategorySalesMap>((acc, [key, value]) => {
        return {
          ...acc,
          [key]: { ...value, sum: RoundToTwoDecimalPlaces(value.sum / 100) },
        };
      }, {}),
      tips: RoundToTwoDecimalPlaces(report.tips / 100),
      tax: RoundToTwoDecimalPlaces(report.tax / 100),
      tendered: RoundToTwoDecimalPlaces(report.tendered / 100),
    };
  }
}
