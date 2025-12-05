import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { formatRFC3339 } from 'date-fns';

import {
  CartByPrinterGroup,
  type CategorizedRebuiltCart,
  DateTimeIntervalBuilder,
  EventTitleStringBuilder,
  type FulfillmentConfig,
  type FulfillmentData,
  WDateUtils,
  type WOrderInstance,
} from '@wcp/wario-shared';

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
  private readonly logger = new Logger(PrinterService.name);

  constructor(
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    @Inject(forwardRef(() => DataProviderService))
    private dataProvider: DataProviderService,
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogService: CatalogProviderService,
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

      this.logger.log(`Sent ${squareOrderIds.length.toString()} print orders for order ${order.id}`);

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send print orders: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
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

      this.logger.log(`Sent move ticket for order ${order.id} to ${destination}`);

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send move ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
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

      this.logger.log(`Sent message ticket: ${ticketName}`);

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send message: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
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
        this.logger.warn(`Failed to retrieve print orders for cancellation: ${JSON.stringify(squareOrderIds)}`);
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
        } catch (err) {
          this.logger.error(`Failed to cancel print order ${order.id}: ${JSON.stringify(err)}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in CancelPrintOrders: ${JSON.stringify(error)}`);
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
          message: entries.map((x) => `CANCEL ${x.quantity}x:${x.product.m.name}`),
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

      this.logger.log(`Sent cancel ticket for order ${order.id}`);

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send cancel ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
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

      this.logger.log(`Sent time change ticket for order ${order.id}`);

      return {
        success: true,
        squareOrderIds,
      };
    } catch (error: unknown) {
      const errorDetail = `Failed to send time change ticket: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      this.logger.error(errorDetail);
      return {
        success: false,
        squareOrderIds: [],
        error: errorDetail,
      };
    }
  }
}
