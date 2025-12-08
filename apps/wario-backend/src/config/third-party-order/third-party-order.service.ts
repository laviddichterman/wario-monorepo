/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { UTCDate } from '@date-fns/utc';
import { Inject, Injectable } from '@nestjs/common';
import { formatISO, formatRFC3339, subMinutes } from 'date-fns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CURRENCY,
  DetermineCartBasedLeadTime,
  OrderPaymentAllocated,
  PaymentMethod,
  TenderBaseStatus,
  WDateUtils,
  WFulfillmentStatus,
  type WOrderInstance,
  WOrderStatus,
} from '@wcp/wario-shared';

import { type IOrderRepository, ORDER_REPOSITORY } from '../../repositories/interfaces/order.repository.interface';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { BigIntMoneyToIntMoney, LineItemsToOrderInstanceCart } from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

/**
 * Service responsible for ingesting orders from 3rd party platforms (DoorDash, UberEats).
 * These orders come through Square KDS and need to be converted to WARIO format.
 */
@Injectable()
export class ThirdPartyOrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private orderRepo: IOrderRepository,
    private squareService: SquareService,
    private catalogProviderService: CatalogProviderService,
    private dataProvider: DataProviderService,
    @InjectPinoLogger(ThirdPartyOrderService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Maps a 3rd party source name to a short code.
   */
  private Map3pSource = (source: string) => {
    if (source.startsWith('Postmates') || source.startsWith('Uber')) {
      return 'UE';
    }
    return 'DD';
  };

  /**
   * Queries Square for 3rd party orders and ingests them into WARIO.
   * This runs on a scheduled interval from TasksService.
   */
  Query3pOrders = async () => {
    // Skip if no 3P location configured
    if (!this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P) {
      return;
    }

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

      if (!recentlyUpdatedOrdersResponse.success) {
        return;
      }

      const fulfillmentConfig =
        this.dataProvider.Fulfillments[this.dataProvider.KeyValueConfig.THIRD_PARTY_FULFILLMENT];
      const ordersToInspect = (recentlyUpdatedOrdersResponse.result.orders ?? []).filter(
        (x) => x.lineItems && x.lineItems.length > 0 && x.fulfillments?.length === 1,
      );
      const squareOrderIds = ordersToInspect.map((x) => x.id as string);

      // Find orders we've already ingested
      const found3pOrders = await this.orderRepo.findByThirdPartySquareIds(squareOrderIds);

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
          // Generate the WARIO cart from the square order
          const cart = LineItemsToOrderInstanceCart(squareOrder.lineItems!, {
            Catalog: this.catalogProviderService.Catalog,
            ReverseMappings: this.catalogProviderService.ReverseMappings,
            PrinterGroups: this.catalogProviderService.PrinterGroups,
            CatalogSelectors: this.catalogProviderService.CatalogSelectors,
          });

          // Determine what available time we have for this order
          const cartLeadTime = DetermineCartBasedLeadTime(
            cart,
            this.catalogProviderService.CatalogSelectors.productEntry,
          );
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
            this.logger.error(
              {
                fulfillmentConfigDisplayName: fulfillmentConfig.displayName,
                requestedTime: WDateUtils.MinutesToPrintTime(requestedFulfillmentTime.selectedTime),
              },
              'Requested fulfillment is no longer valid and could not find suitable time. Ignoring WARIO timing and sending order for originally requested time.',
            );
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
        } catch (err: unknown) {
          this.logger.error({ err, ordersToInspect }, 'Skipping due to error ingesting.');
        }
      });

      if (orderInstances.length > 0) {
        this.logger.info({ orderInstancesCount: orderInstances.length, orderInstances }, 'Inserting 3p orders...');
        const savedOrders = await this.orderRepo.bulkCreate(orderInstances);
        this.logger.info({ savedOrdersCount: savedOrders.length }, 'Saved 3p orders');
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Got error when attempting to ingest 3p orders');
    }
  };
}
