import { UTCDate } from '@date-fns/utc';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { formatRFC3339, isBefore, subDays } from 'date-fns';
import { Model } from 'mongoose';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import {
  CartByPrinterGroup,
  type CategorizedRebuiltCart,
  CrudOrderResponse,
  DateTimeIntervalBuilder,
  EventTitleStringBuilder,
  type FulfillmentConfig,
  type FulfillmentData,
  RebuildAndSortCart,
  ResponseSuccess,
  ResponseWithStatusCode,
  WDateUtils,
  WFulfillmentStatus,
  type WOrderInstance,
} from '@wcp/wario-shared';

import { WOrderInstanceDocument } from '../../models/orders/WOrderInstance';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import {
  CreateOrderForMessages,
  CreateOrdersForPrintingFromCart,
  GetSquareIdFromExternalIds,
} from '../square-wario-bridge';
import { SquareService } from '../square/square.service';

/**
 * Represents the result of a print operation.
 */
export interface PrintResult {
  success: boolean;
  squareOrderIds: string[];
  error?: string;
}

/**
 * Information about a message to send to a printer group.
 */
export interface PrinterMessage {
  squareItemVariationId: string;
  message: string[];
}

/**
 * Service responsible for abstracting order printing.
 *
 * Currently uses a "dummy" Square location (SQUARE_LOCATION_ALTERNATE) as a workaround
 * because Square KDS doesn't print reliably at the times we need. A tablet running
 * Square POS is logged into this alternate location at the restaurant.
 *
 * Future plan: Replace with a direct printing service that dispatches print jobs.
 */
@Injectable()
export class PrinterService {

  constructor(
    @InjectModel('WOrderInstance')
    private orderModel: Model<WOrderInstanceDocument>,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => DataProviderService))
    private dataProvider: DataProviderService,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogService: CatalogProviderService,
    @InjectPinoLogger(PrinterService.name)
    private readonly logger: PinoLogger,
  ) { }

  /**
   * Gets the alternate Square location used for printing.
   * This is a workaround until direct printing is implemented.
   */
  get PrinterLocation(): string {
    return this.dataProvider.KeyValueConfig.SQUARE_LOCATION_ALTERNATE;
  }

  /**
   * Gets the 3rd party Square location (if configured).
   */
  get ThirdPartyLocation(): string | undefined {
    return this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P;
  }

  /**
   * Gets all locations that need print order cleanup.
   * This includes the alternate (printing) location and optionally the 3P location.
   */
  get CleanupLocations(): string[] {
    return this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P
      ? [this.PrinterLocation, this.dataProvider.KeyValueConfig.SQUARE_LOCATION_3P]
      : [this.PrinterLocation];
  }

  /**
   * Sends an order to the printer(s) via Square.
   * Creates orders based on printer group assignments in the cart.
   *
   * @param order - The WARIO order to print
   * @param rebuiltCart - The cart rebuilt with current catalog data
   * @param eventTitle - The title/header for the print ticket
   * @param fulfillmentConfig - The fulfillment configuration
   * @returns Print result with Square order IDs
   */
  async SendPrintOrders(
    order: WOrderInstance,
    rebuiltCart: CategorizedRebuiltCart,
    eventTitle: string,
    fulfillmentConfig: FulfillmentConfig,
  ): Promise<PrintResult> {
    try {
      const promisedTime = DateTimeIntervalBuilder(order.fulfillment as FulfillmentData, fulfillmentConfig.maxDuration);
      const flatCart = Object.values(rebuiltCart).flat();

      const messageOrders = CreateOrdersForPrintingFromCart(
        this.PrinterLocation,
        order.id,
        eventTitle,
        flatCart,
        {
          displayName: `${WDateUtils.MinutesToPrintTime(order.fulfillment.selectedTime)} ${eventTitle}`,
          emailAddress: order.customerInfo.email,
          phoneNumber: order.customerInfo.mobileNum,
          pickupAt: promisedTime.start,
          note: order.specialInstructions ?? undefined,
        },
        {
          Catalog: this.catalogService.Catalog,
          ReverseMappings: this.catalogService.ReverseMappings,
          PrinterGroups: this.catalogService.PrinterGroups,
          CatalogSelectors: this.catalogService.CatalogSelectors,
        },
      );

      const squareOrderIds: string[] = [];
      for (const messageOrder of messageOrders) {
        const response = await this.squareService.SendMessageOrder(messageOrder);
        if (response !== false && response.order?.id) {
          squareOrderIds.push(response.order.id);
        }
      }

      this.logger.info({ squareOrderIdsCount: squareOrderIds.length, orderId: order.id }, 'Sent print orders');

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send print orders: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error({ err: error }, 'Failed to send print orders');
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }

  /**
   * Sends a move ticket to expo printers.
   * Used when an order needs to be moved to a different location/status.
   *
   * @param order - The WARIO order
   * @param rebuiltCart - The cart rebuilt with current catalog data
   * @param destination - Where the order is being moved to
   * @param additionalMessage - Optional additional message to include
   * @param fulfillmentConfig - The fulfillment configuration
   * @returns Print result with Square order IDs
   */
  async SendMoveTicket(
    order: WOrderInstance,
    rebuiltCart: CategorizedRebuiltCart,
    destination: string,
    additionalMessage: string,
    fulfillmentConfig: FulfillmentConfig,
  ): Promise<PrintResult> {
    try {
      const promisedTime = DateTimeIntervalBuilder(order.fulfillment as FulfillmentData, fulfillmentConfig.maxDuration);
      const customerName = `${order.customerInfo.givenName} ${order.customerInfo.familyName}`;

      const eventTitle = EventTitleStringBuilder(
        this.catalogService.CatalogSelectors,
        fulfillmentConfig,
        customerName,
        order.fulfillment as FulfillmentData,
        rebuiltCart,
        order.specialInstructions ?? '',
      );

      // Find expo printers
      const expoPrinters = Object.values(this.catalogService.PrinterGroups).filter((x) => x.isExpo);
      if (expoPrinters.length === 0) {
        return {
          success: true,
          squareOrderIds: [],
        };
      }

      // Build message with cart items and move info
      const message: string[] = [
        ...Object.values(rebuiltCart)
          .flat()
          .map((x) => `${x.quantity.toString()}x: ${x.product.m.name}`),
        `Move to ${destination}`,
        ...(additionalMessage ? [additionalMessage] : []),
      ];

      const messages: PrinterMessage[] = expoPrinters
        .map((pg) => {
          const squareId = GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION');
          return squareId ? { squareItemVariationId: squareId, message: message } : null;
        })
        .filter((m): m is PrinterMessage => m !== null);

      const messageOrder = CreateOrderForMessages(
        this.PrinterLocation,
        order.id,
        eventTitle,
        messages,
        {
          displayName: `MOVE ${eventTitle}`,
          emailAddress: order.customerInfo.email,
          phoneNumber: order.customerInfo.mobileNum,
          pickupAt: promisedTime.start,
        },
      );

      const squareOrderIds: string[] = [];
      const response = await this.squareService.SendMessageOrder(messageOrder);
      if (response !== false && response.order?.id) {
        squareOrderIds.push(response.order.id);
      }

      this.logger.info({ orderId: order.id, destination }, 'Sent move ticket');

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send move ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error({ err: error }, 'Failed to send move ticket');
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }

  /**
   * Sends a simple message to specified printer groups.
   * Useful for announcements, alerts, or custom messages.
   *
   * @param referenceId - A reference ID for tracking
   * @param ticketName - The name/title of the ticket
   * @param messages - Array of messages with target printer group IDs
   * @param displayName - Display name for the ticket
   * @returns Print result with Square order IDs
   */
  async SendMessage(
    referenceId: string,
    ticketName: string,
    messages: PrinterMessage[],
    displayName: string,
  ): Promise<PrintResult> {
    try {
      const messageOrder = CreateOrderForMessages(
        this.PrinterLocation,
        referenceId,
        ticketName,
        messages,
        {
          displayName,
          emailAddress: this.dataProvider.KeyValueConfig.EMAIL_ADDRESS,
          phoneNumber: '',
          pickupAt: new Date(),
        },
      );

      const squareOrderIds: string[] = [];
      const response = await this.squareService.SendMessageOrder(messageOrder);
      if (response !== false && response.order?.id) {
        squareOrderIds.push(response.order.id);
      }

      this.logger.info({ ticketName }, 'Sent message ticket');

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send message: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error({ err: error }, 'Failed to send message');
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }

  /**
   * Gets all expo printer groups.
   * Expo printers display tickets for expediting orders.
   */
  GetExpoPrinters(): { id: string; name: string; squareItemVariationId: string | null }[] {
    return Object.entries(this.catalogService.PrinterGroups)
      .filter(([_, pg]) => pg.isExpo)
      .map(([id, pg]) => ({
        id,
        name: pg.name,
        squareItemVariationId: GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION'),
      }));
  }

  /**
   * Gets all printer groups.
   */
  GetAllPrinters(): { id: string; name: string; isExpo: boolean; squareItemVariationId: string | null }[] {
    return Object.entries(this.catalogService.PrinterGroups).map(([id, pg]) => ({
      id,
      name: pg.name,
      isExpo: pg.isExpo,
      squareItemVariationId: GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION'),
    }));
  }

  /**
   * Cancels previously sent print orders.
   *
   * @param squareOrderIds - IDs of Square orders to cancel
   * @param reason - Reason for cancellation
   */
  async CancelPrintOrders(squareOrderIds: string[], reason: string): Promise<void> {
    if (squareOrderIds.length === 0) {
      return;
    }

    try {
      const batchOrders = await this.squareService.BatchRetrieveOrders(
        this.PrinterLocation,
        squareOrderIds,
      );

      if (!batchOrders.success || !batchOrders.result.orders) {
        this.logger.warn({ squareOrderIds }, 'Failed to retrieve print orders for cancellation');
        return;
      }

      const ordersToCancel = batchOrders.result.orders.filter((o) => o.state === 'OPEN');

      for (const order of ordersToCancel) {
        try {
          if (order.id && order.version !== undefined) {
            await this.squareService.OrderUpdate(
              this.PrinterLocation,
              order.id,
              order.version,
              {
                fulfillments:
                  order.fulfillments?.map((x) => ({
                    uid: x.uid,
                    state: 'CANCELED',
                    pickupDetails: {
                      canceledAt: formatRFC3339(new Date()),
                      cancelReason: reason,
                    },
                  })) ?? [],
              },
              [],
            );
          }
        } catch (err: unknown) {
          this.logger.error({ err, orderId: order.id }, 'Failed to cancel print order');
        }
      }
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Error in CancelPrintOrders');
    }
  }

  /**
   * Sends a cancellation ticket to printers.
   *
   * @param order - The WARIO order being canceled
   * @param rebuiltCart - The cart rebuilt with current catalog data
   * @param fulfillmentConfig - The fulfillment configuration
   * @returns Print result with Square order IDs
   */
  async SendCancelTicket(
    order: WOrderInstance,
    rebuiltCart: CategorizedRebuiltCart,
    fulfillmentConfig: FulfillmentConfig,
  ): Promise<PrintResult> {
    try {

      const oldPromisedTime = WDateUtils.ComputeServiceDateTime(order.fulfillment as FulfillmentData);
      const customerName = `${order.customerInfo.givenName} ${order.customerInfo.familyName}`;

      const eventTitle = EventTitleStringBuilder(
        this.catalogService.CatalogSelectors,
        fulfillmentConfig,
        customerName,
        order.fulfillment as FulfillmentData,
        rebuiltCart,
        order.specialInstructions ?? '',
      );

      const flatCart = Object.values(rebuiltCart).flat();

      const messages: PrinterMessage[] = Object.entries(
        CartByPrinterGroup(flatCart, this.catalogService.CatalogSelectors.productEntry),
      ).map(([pgId, entries]) => {
        const pg = this.catalogService.PrinterGroups[pgId];
        if (!pg) return null;

        const squareId = GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION');
        if (!squareId) return null;

        return {
          squareItemVariationId: squareId,
          message: entries.map((x) => `CANCEL ${String(x.quantity)}x:${x.product.m.name}`),
        };
      })
        .filter((m): m is PrinterMessage => m !== null);

      const messageOrder = CreateOrderForMessages(
        this.PrinterLocation,
        order.id,
        eventTitle,
        messages,
        {
          displayName: `CANCEL ${eventTitle}`,
          emailAddress: order.customerInfo.email,
          phoneNumber: order.customerInfo.mobileNum,
          pickupAt: oldPromisedTime,
          note: `CANCEL ${eventTitle}`,
        },
      );

      const squareOrderIds: string[] = [];
      const response = await this.squareService.SendMessageOrder(messageOrder);
      if (response !== false && response.order?.id) {
        squareOrderIds.push(response.order.id);
      }

      this.logger.info({ orderId: order.id }, 'Sent cancel ticket');

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send cancel ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error({ err: error }, 'Failed to send cancel ticket');
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }
  /**
 * Sends a time change ticket to printers.
 *
 * @param order - The WARIO order
 * @param rebuiltCart - The cart rebuilt with current catalog data
 * @param fulfillmentConfig - The fulfillment configuration
 * @param oldPromisedTime - The previous promised time
 * @returns Print result with Square order IDs
 */
  async SendTimeChangeTicket(
    order: WOrderInstance,
    rebuiltCart: CategorizedRebuiltCart,
    fulfillmentConfig: FulfillmentConfig,
    oldPromisedTime: Date,
  ): Promise<PrintResult> {
    try {
      const customerName = `${order.customerInfo.givenName} ${order.customerInfo.familyName}`;

      const eventTitle = EventTitleStringBuilder(
        this.catalogService.CatalogSelectors,
        fulfillmentConfig,
        customerName,
        order.fulfillment as FulfillmentData,
        rebuiltCart,
        order.specialInstructions ?? '',
      );

      const flatCart = Object.values(rebuiltCart).flat();

      const messages: PrinterMessage[] = Object.entries(
        CartByPrinterGroup(flatCart, this.catalogService.CatalogSelectors.productEntry),
      ).map(([pgId, entries]) => {
        const pg = this.catalogService.PrinterGroups[pgId];
        if (!pg) return null;

        const squareId = GetSquareIdFromExternalIds(pg.externalIDs, 'ITEM_VARIATION');
        if (!squareId) return null;

        return {
          squareItemVariationId: squareId,
          message: entries.map((x) => `TIME CHANGE ${x.quantity.toString()}x:${x.product.m.name}`),
        };
      })
        .filter((m): m is PrinterMessage => m !== null);

      const messageOrder = CreateOrderForMessages(
        this.PrinterLocation,
        order.id,
        eventTitle,
        messages,
        {
          displayName: `TIME CHANGE ${eventTitle}`,
          emailAddress: order.customerInfo.email,
          phoneNumber: order.customerInfo.mobileNum,
          pickupAt: oldPromisedTime,
          note: `TIME CHANGE ${eventTitle}`,
        },
      );

      const squareOrderIds: string[] = [];
      const response = await this.squareService.SendMessageOrder(messageOrder);
      if (response !== false && response.order?.id) {
        squareOrderIds.push(response.order.id);
      }

      this.logger.info({ orderId: order.id }, 'Sent time change ticket');

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send time change ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error({ err: error }, 'Failed to send time change ticket');
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }

  /**
   * Clears past print orders by completing them on Square.
   * This is necessary because the printing workaround creates dummy orders
   * that need to be cleaned up after they've served their purpose.
   */
  ClearPastOrders = async () => {
    try {
      const timeSpanAgoEnd = subDays(new UTCDate(), 1);
      const timeSpanAgoStart = subDays(timeSpanAgoEnd, 1);
      this.logger.info(
        { start: formatRFC3339(timeSpanAgoStart), end: formatRFC3339(timeSpanAgoEnd) },
        'Clearing old print orders',
      );
      const locationsToSearch = this.CleanupLocations;
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
        this.logger.info({ count: oldOrdersResults.result.orders?.length ?? 0 }, 'Found old print orders to complete');
        const ordersToComplete = (oldOrdersResults.result.orders ?? []).filter(
          (x) =>
            (x.fulfillments ?? []).length === 1 &&
            x.fulfillments?.[0].pickupDetails?.pickupAt &&
            isBefore(new UTCDate(x.fulfillments[0].pickupDetails.pickupAt), timeSpanAgoEnd),
        );
        for (const squareOrder of ordersToComplete) {
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
              this.logger.debug({ squareOrderId: squareOrder.id }, 'Marked print order as completed');
            }
          } catch (err1: unknown) {
            this.logger.error(
              { err: err1, squareOrderId: squareOrder.id },
              'Skipping print order completion',
            );
          }
        }
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Error clearing past print orders');
    }
  };
  /**
   * Sends a locked order to the printers and updates its status.
   */
  SendLockedOrder = async (
    lockedOrder: WOrderInstance,
    releaseLock: boolean,
  ): Promise<ResponseWithStatusCode<CrudOrderResponse>> => {
    this.logger.debug(
      { orderId: lockedOrder.id, fulfillment: lockedOrder.fulfillment, customerInfo: lockedOrder.customerInfo },
      'Sending order, lock applied.',
    );
    try {
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

      const printResult = await this.SendPrintOrders(
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
      this.logger.error({ err: error }, 'Caught error when attempting to send order');
      if (releaseLock) {
        try {
          await this.orderModel.findOneAndUpdate({ _id: lockedOrder.id }, { locked: null });
        } catch (err2: unknown) {
          this.logger.error(
            { err: err2 },
            'Got even worse error in attempting to release lock on order we failed to finish send processing',
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
}
