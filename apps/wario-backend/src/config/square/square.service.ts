import crypto from 'crypto';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { parseISO } from 'date-fns';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  BatchDeleteCatalogObjectsRequest,
  BatchDeleteCatalogObjectsResponse,
  BatchRetrieveCatalogObjectsRequest,
  BatchRetrieveCatalogObjectsResponse,
  BatchRetrieveOrdersResponse,
  BatchUpsertCatalogObjectsRequest,
  BatchUpsertCatalogObjectsResponse,
  CancelPaymentResponse,
  CatalogInfoResponse,
  CatalogInfoResponseLimits,
  CatalogObject,
  CatalogObjectBatch,
  Client,
  CreateOrderRequest,
  CreateOrderResponse,
  CreatePaymentRequest,
  CreatePaymentResponse,
  Environment,
  ListCatalogResponse,
  Money,
  Order,
  Payment,
  PaymentRefund,
  PayOrderRequest,
  PayOrderResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
  RetrieveOrderResponse,
  SearchCatalogItemsRequest,
  SearchCatalogItemsResponse,
  SearchCatalogObjectsRequest,
  SearchCatalogObjectsResponse,
  SearchOrdersQuery,
  SearchOrdersRequest,
  SearchOrdersResponse,
  type Error as SquareError,
  UpdateOrderRequest,
  UpdateOrderResponse,
  UpsertCatalogObjectRequest,
  UpsertCatalogObjectResponse,
} from 'square';
import { ApiResponse, RetryConfiguration } from 'square/dist/types/core';

export { SquareError };

import {
  CURRENCY,
  IMoney,
  OrderPaymentAllocated,
  PaymentMethod,
  StoreCreditPayment,
  StoreCreditPaymentData,
} from '@wcp/wario-shared';

import { ExponentialBackoffWaitFunction } from '../../utils/exponential-backoff';
import { AppConfigService } from '../app-config.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { MigrationFlagsService } from '../migration-flags.service';
import { BigIntMoneyToIntMoney, IMoneyToBigIntMoney, MapPaymentStatus } from '../square-wario-bridge';

export type SquareProviderApiCallReturnSuccess<T> = {
  success: true;
  result: T;
  error: SquareError[];
};
export type SquareProviderApiCallReturnValue<T> =
  | SquareProviderApiCallReturnSuccess<T>
  | { success: false; result: null; error: SquareError[] };

export interface SquareProviderProcessPaymentRequest {
  locationId: string;
  sourceId: string;
  amount: IMoney;
  referenceId: string;
  squareOrderId: string;
  verificationToken?: string;
}

export interface SquareProviderCreatePaymentRequest extends SquareProviderProcessPaymentRequest {
  storeCreditPayment?: StoreCreditPayment;
  tipAmount?: IMoney;
  autocomplete: boolean;
}
type NonNullableFields<T> = { [P in keyof T]: NonNullable<T[P]> };

const DEFAULT_LIMITS: Required<NonNullableFields<CatalogInfoResponseLimits>> = {
  batchDeleteMaxObjectIds: 200,
  batchRetrieveMaxObjectIds: 1000,
  batchUpsertMaxObjectsPerBatch: 1000,
  batchUpsertMaxTotalObjects: 10000,
  searchMaxPageLimit: 1000,
  updateItemModifierListsMaxItemIds: 1000,
  updateItemModifierListsMaxModifierListsToDisable: 1000,
  updateItemModifierListsMaxModifierListsToEnable: 1000,
  updateItemTaxesMaxItemIds: 1000,
  updateItemTaxesMaxTaxesToDisable: 1000,
  updateItemTaxesMaxTaxesToEnable: 1000,
};

const SQUARE_RETRY_CONFIG: RetryConfiguration = {
  maxNumberOfRetries: 5,
  retryOnTimeout: true,
  retryInterval: 1,
  maximumRetryWaitTime: 0,
  backoffFactor: 3,
  httpStatusCodesToRetry: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
  httpMethodsToRetry: ['GET', 'DELETE', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'LINK', 'UNLINK'],
};

interface SquareResponseBase {
  errors?: SquareError[];
}

const SquareCallFxnWrapper = async <T extends SquareResponseBase>(
  apiRequestMaker: () => Promise<ApiResponse<T>>,
  retry = 0,
  logger: PinoLogger,
): Promise<SquareProviderApiCallReturnValue<T>> => {
  try {
    const result = await apiRequestMaker();
    if (SQUARE_RETRY_CONFIG.httpStatusCodesToRetry.includes(result.statusCode)) {
      if (retry < SQUARE_RETRY_CONFIG.maxNumberOfRetries) {
        await ExponentialBackoffWaitFunction(retry, SQUARE_RETRY_CONFIG.maxNumberOfRetries, logger);
        return await SquareCallFxnWrapper(apiRequestMaker, retry + 1, logger);
      }
    }
    if (result.result.errors && result.result.errors.length > 0) {
      logger.debug(
        "Got to the case that we're not sure ever happens. Do we always get an exception on failure? TRAXXXSTRING",
      );
      return {
        success: false,
        result: null,
        error: result.result.errors ?? [],
      };
    }
    return { success: true, result: result.result, error: [] };
  } catch (error: unknown) {
    const err = error as { statusCode: number; errors: SquareError[] };
    try {
      if (SQUARE_RETRY_CONFIG.httpStatusCodesToRetry.includes(err.statusCode)) {
        if (retry < SQUARE_RETRY_CONFIG.maxNumberOfRetries) {
          await ExponentialBackoffWaitFunction(retry, SQUARE_RETRY_CONFIG.maxNumberOfRetries, logger);
          return await SquareCallFxnWrapper(apiRequestMaker, retry + 1, logger);
        }
      }
      return {
        success: false,
        result: null,
        error: err.errors,
      };
    } catch {
      logger.error({ err: error }, 'Got unknown error');
      return {
        success: false,
        result: null,
        error: [
          {
            category: 'API_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            detail: 'Internal Server Error. Please reach out for assistance.',
          },
        ],
      };
    }
  }
};

@Injectable()
export class SquareService implements OnModuleInit {
  private client: Client;
  private catalogLimits: Required<NonNullableFields<CatalogInfoResponseLimits>>;
  private catalogIdsToDelete: string[];
  private _isInitialized = false;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly dataProvider: DataProviderService,
    private readonly migrationFlags: MigrationFlagsService,
    @InjectPinoLogger(SquareService.name)
    private readonly logger: PinoLogger,
  ) {
    this.catalogLimits = DEFAULT_LIMITS;
    this.catalogIdsToDelete = [];
  }

  set CatalogIdsToDeleteOnLoad(value: string[]) {
    this.catalogIdsToDelete = value.slice();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async onModuleInit() {
    this.logger.info('Starting Bootstrap of SquareService');
    if (this.dataProvider.KeyValueConfig.SQUARE_TOKEN) {
      this.client = new Client({
        environment: this.appConfig.isProduction ? Environment.Production : Environment.Sandbox,
        accessToken: this.dataProvider.KeyValueConfig.SQUARE_TOKEN,
        httpClientOptions: {
          retryConfig: SQUARE_RETRY_CONFIG,
        },
      });
    } else {
      this.logger.error("Can't Bootstrap SQUARE Provider, failed creating client");
      return;
    }
    const catalogInfoLimitsResponse = await this.GetCatalogInfo();
    if (catalogInfoLimitsResponse.success) {
      this.catalogLimits = {
        ...catalogInfoLimitsResponse.result,
        ...DEFAULT_LIMITS,
      };
    } else {
      this.logger.error("Can't Bootstrap SQUARE Provider, failed querying catalog limits");
      return;
    }

    if (this.catalogIdsToDelete.length > 0) {
      this.logger.info('Migration requested square catalog object deletion.');
      await this.BatchDeleteCatalogObjects(this.catalogIdsToDelete);
      this.catalogIdsToDelete = [];
    }

    if (this.migrationFlags.obliterateModifiersOnLoad) {
      this.logger.info('Obliterating modifiers for this location on load');
      await this.ObliterateModifiersInSquareCatalog();
    }

    this._isInitialized = true;
    this.logger.info('Finished Bootstrap of SquareService');
  }

  private async ObliterateItemsInSquareCatalog() {
    // get all items in the Slices category and delete them
    const foundItems: string[] = [];
    let cursor: string | undefined;
    let response: SquareProviderApiCallReturnValue<SearchCatalogItemsResponse>;
    do {
      response = await this.SearchCatalogItems({
        enabledLocationIds: [this.dataProvider.KeyValueConfig.SQUARE_LOCATION],
        ...(cursor ? { cursor } : {}),
      });
      if (!response.success) {
        return;
      }
      foundItems.push(...(response.result.items ?? []).map((x) => x.id));
      cursor = response.result.cursor ?? undefined;
    } while (cursor);
    this.logger.info(`Deleting the following items: ${foundItems.join(', ')}`);
    await this.BatchDeleteCatalogObjects(foundItems);
  }

  private async ObliterateModifiersInSquareCatalog() {
    const foundItems: string[] = [];
    let cursor: string | undefined;
    let response: SquareProviderApiCallReturnValue<ListCatalogResponse>;
    do {
      response = await this.ListCatalogObjects(['MODIFIER_LIST'], cursor);
      if (!response.success) {
        return;
      }
      foundItems.push(
        ...(response.result.objects ?? [])
          .filter((x) => x.presentAtLocationIds?.includes(this.dataProvider.KeyValueConfig.SQUARE_LOCATION))
          .map((x) => x.id),
      );
      cursor = response.result.cursor ?? undefined;
    } while (cursor);
    this.logger.info(`Deleting the following object Modifier List IDs: ${foundItems.join(', ')}`);
    await this.BatchDeleteCatalogObjects(foundItems);
  }

  private async ObliterateCategoriesInSquareCatalog() {
    const foundItems: string[] = [];
    let cursor: string | undefined;
    let response: SquareProviderApiCallReturnValue<ListCatalogResponse>;
    do {
      response = await this.ListCatalogObjects(['CATEGORY'], cursor);
      if (!response.success) {
        return;
      }
      foundItems.push(...(response.result.objects ?? []).map((x) => x.id));
      cursor = response.result.cursor ?? undefined;
    } while (cursor);
    this.logger.info(`Deleting the following Category object IDs: ${foundItems.join(', ')}`);
    await this.BatchDeleteCatalogObjects(foundItems);
  }

  async GetCatalogInfo(): Promise<SquareProviderApiCallReturnValue<CatalogInfoResponseLimits>> {
    const api = this.client.catalogApi;
    const call_fxn = async (): Promise<ApiResponse<CatalogInfoResponse>> => {
      this.logger.debug('sending Catalog Info request to Square API');
      return await api.catalogInfo();
    };
    const response = await SquareCallFxnWrapper(call_fxn, 0, this.logger);
    if (response.success && response.result.limits) {
      return { success: true, result: response.result.limits, error: [] };
    }
    return {
      success: false,
      result: null,
      error: response.error,
    };
  }

  async CreateOrder(order: Order): Promise<SquareProviderApiCallReturnValue<CreateOrderResponse>> {
    // TODO: use idempotency key from order instead
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const orders_api = this.client.ordersApi;
    const request_body: CreateOrderRequest = {
      idempotencyKey: idempotency_key,
      order: order,
    };
    const call_fxn = async (): Promise<ApiResponse<CreateOrderResponse>> => {
      this.logger.debug({ request_body }, 'sending order request');
      return await orders_api.createOrder(request_body);
    };
    return await SquareCallFxnWrapper(call_fxn, 0, this.logger);
  }

  async OrderUpdate(
    locationId: string,
    orderId: string,
    version: number,
    updatedOrder: Omit<Partial<Order>, 'locationId' | 'version' | 'id'>,
    fieldsToClear: string[],
  ) {
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const orders_api = this.client.ordersApi;
    const request_body: UpdateOrderRequest = {
      idempotencyKey: idempotency_key,
      fieldsToClear,
      order: {
        ...updatedOrder,
        locationId,
        version,
      },
    };

    const callFxn = async (): Promise<ApiResponse<UpdateOrderResponse>> => {
      this.logger.debug({ orderId, request_body }, 'sending order update request');
      return await orders_api.updateOrder(orderId, request_body);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async OrderStateChange(locationId: string, orderId: string, version: number, new_state: string) {
    return this.OrderUpdate(locationId, orderId, version, { state: new_state }, []);
  }

  async RetrieveOrder(squareOrderId: string) {
    const orders_api = this.client.ordersApi;
    const callFxn = async (): Promise<ApiResponse<RetrieveOrderResponse>> => {
      this.logger.debug({ squareOrderId }, 'Getting Square Order');
      return await orders_api.retrieveOrder(squareOrderId);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async BatchRetrieveOrders(locationId: string, orderIds: string[]) {
    const orders_api = this.client.ordersApi;
    const callFxn = async (): Promise<ApiResponse<BatchRetrieveOrdersResponse>> => {
      this.logger.debug({ orderIds }, 'Getting Square Orders');
      return await orders_api.batchRetrieveOrders({ orderIds, locationId });
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async SearchOrders(
    locationIds: string[],
    query: SearchOrdersQuery,
  ): Promise<SquareProviderApiCallReturnValue<SearchOrdersResponse>> {
    const orders_api = this.client.ordersApi;
    const request_body: SearchOrdersRequest = {
      query,
      locationIds,
    };
    const callFxn = async (): Promise<ApiResponse<SearchOrdersResponse>> => {
      this.logger.debug({ request_body }, 'Searching Square Orders');
      return await orders_api.searchOrders(request_body);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async CreatePayment({
    locationId,
    sourceId,
    storeCreditPayment,
    amount,
    referenceId,
    squareOrderId,
    tipAmount,
    verificationToken,
    autocomplete,
  }: SquareProviderCreatePaymentRequest): Promise<SquareProviderApiCallReturnValue<OrderPaymentAllocated>> {
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const payments_api = this.client.paymentsApi;
    const tipMoney = tipAmount ?? { currency: CURRENCY.USD, amount: 0 };
    const request_body: CreatePaymentRequest = {
      sourceId: storeCreditPayment ? 'EXTERNAL' : sourceId,
      externalDetails: storeCreditPayment
        ? {
            type: 'STORED_BALANCE',
            source: 'WARIO',
            sourceId: storeCreditPayment.payment.code,
          }
        : undefined,
      ...(sourceId === 'CASH'
        ? {
            cashDetails: {
              buyerSuppliedMoney: IMoneyToBigIntMoney(amount),
              changeBackMoney: { amount: 0n, currency: amount.currency },
            },
          }
        : {}),
      amountMoney: IMoneyToBigIntMoney({
        currency: amount.currency,
        amount: amount.amount - tipMoney.amount,
      }),
      tipMoney: IMoneyToBigIntMoney(tipMoney),
      referenceId: storeCreditPayment ? storeCreditPayment.payment.code : referenceId,
      orderId: squareOrderId,
      locationId,
      autocomplete,
      acceptPartialAuthorization: false,
      verificationToken,
      idempotencyKey: idempotency_key,
    };

    const callFxn = async (): Promise<ApiResponse<CreatePaymentResponse>> => {
      this.logger.debug({ request_body }, 'sending payment request');
      return await payments_api.createPayment(request_body);
    };
    const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
    if (response.success && response.result.payment && response.result.payment.status) {
      const paymentStatus = MapPaymentStatus(response.result.payment.status);
      const createdAt = parseISO(response.result.payment.createdAt as string).valueOf();
      const processorId = response.result.payment.id as string;
      return {
        success: true,
        result: storeCreditPayment
          ? {
              ...storeCreditPayment,
              status: paymentStatus,
              processorId,
              payment: {
                ...(storeCreditPayment.payment as StoreCreditPaymentData),
              },
            }
          : response.result.payment.sourceType === 'CASH'
            ? {
                t: PaymentMethod.Cash,
                createdAt,
                processorId,
                amount: BigIntMoneyToIntMoney(response.result.payment.totalMoney as Money),
                tipAmount: tipMoney,
                status: paymentStatus,
                payment: {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  amountTendered: BigIntMoneyToIntMoney(response.result.payment.cashDetails!.buyerSuppliedMoney),
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  change: response.result.payment.cashDetails!.changeBackMoney
                    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      BigIntMoneyToIntMoney(response.result.payment.cashDetails!.changeBackMoney)
                    : { currency: amount.currency, amount: 0 },
                },
              }
            : {
                t: PaymentMethod.CreditCard,
                createdAt,
                processorId,
                amount: BigIntMoneyToIntMoney(response.result.payment.totalMoney as Money),
                tipAmount: tipMoney,
                status: paymentStatus,
                payment: {
                  processor: 'SQUARE',
                  billingZip: response.result.payment.billingAddress?.postalCode ?? undefined,
                  cardBrand: response.result.payment.cardDetails?.card?.cardBrand ?? undefined,
                  expYear: response.result.payment.cardDetails?.card?.expYear?.toString(),
                  last4: response.result.payment.cardDetails?.card?.last4 ?? '',
                  receiptUrl:
                    response.result.payment.receiptUrl ??
                    `https://squareup.com/receipt/preview/${response.result.payment.id as string}`,
                  cardholderName: response.result.payment.cardDetails?.card?.cardholderName ?? undefined,
                },
              },
        error: [],
      };
    }
    return {
      success: false,
      result: null,
      error: response.error,
    };
  }

  async ProcessPayment({
    locationId,
    sourceId,
    amount,
    referenceId,
    squareOrderId,
    verificationToken,
  }: SquareProviderProcessPaymentRequest) {
    return await this.CreatePayment({
      locationId,
      sourceId,
      amount,
      referenceId,
      squareOrderId,
      verificationToken,
      autocomplete: true,
    });
  }

  async PayOrder(
    square_order_id: string,
    paymentIds: string[],
  ): Promise<SquareProviderApiCallReturnValue<PayOrderResponse>> {
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const orders_api = this.client.ordersApi;
    const request_body: PayOrderRequest = {
      idempotencyKey: idempotency_key,
      paymentIds,
    };

    const callFxn = async (): Promise<ApiResponse<PayOrderResponse>> => {
      this.logger.debug({ square_order_id, request_body }, 'sending order payment request');
      return await orders_api.payOrder(square_order_id, request_body);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async RefundPayment(
    squarePaymentId: string,
    amount: IMoney,
    reason: string,
  ): Promise<SquareProviderApiCallReturnValue<PaymentRefund>> {
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const refundsApi = this.client.refundsApi;
    const request_body: RefundPaymentRequest = {
      reason,
      amountMoney: IMoneyToBigIntMoney(amount),
      idempotencyKey: idempotency_key,
      paymentId: squarePaymentId,
    };

    const callFxn = async (): Promise<ApiResponse<RefundPaymentResponse>> => {
      this.logger.debug({ request_body }, 'sending payment REFUND request');
      return await refundsApi.refundPayment(request_body);
    };
    const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
    if (
      response.success &&
      response.result.refund &&
      response.result.refund.status !== 'REJECTED' &&
      response.result.refund.status !== 'FAILED'
    ) {
      return {
        success: true,
        result: response.result.refund,
        error: [],
      };
    }
    return {
      success: false,
      result: null,
      error: response.error,
    };
  }

  async CancelPayment(squarePaymentId: string): Promise<SquareProviderApiCallReturnValue<Payment>> {
    const paymentsApi = this.client.paymentsApi;
    const callFxn = async (): Promise<ApiResponse<CancelPaymentResponse>> => {
      this.logger.debug({ squarePaymentId }, 'sending payment CANCEL request');
      return await paymentsApi.cancelPayment(squarePaymentId);
    };
    const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
    if (response.success && response.result.payment && response.result.payment.status === 'CANCELED') {
      return {
        success: true,
        result: response.result.payment,
        error: [],
      };
    }
    return {
      success: false,
      result: null,
      error: response.error,
    };
  }

  async UpsertCatalogObject(object: CatalogObject) {
    const idempotency_key = crypto.randomBytes(22).toString('hex');
    const catalogApi = this.client.catalogApi;
    const request_body: UpsertCatalogObjectRequest = {
      idempotencyKey: idempotency_key,
      object,
    };

    const callFxn = async (): Promise<ApiResponse<UpsertCatalogObjectResponse>> => {
      this.logger.debug({ request_body }, 'sending catalog upsert');
      return await catalogApi.upsertCatalogObject(request_body);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async SearchCatalogItems(searchRequest: Omit<SearchCatalogItemsRequest, 'limit'>) {
    const catalogApi = this.client.catalogApi;

    const callFxn = async (): Promise<ApiResponse<SearchCatalogItemsResponse>> => {
      this.logger.debug({ searchRequest }, 'sending catalog item search');
      return await catalogApi.searchCatalogItems(searchRequest);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async SearchCatalogObjects(searchRequest: Omit<SearchCatalogObjectsRequest, 'limit'>) {
    const catalogApi = this.client.catalogApi;

    const callFxn = async (): Promise<ApiResponse<SearchCatalogObjectsResponse>> => {
      this.logger.debug({ searchRequest }, 'sending catalog search');
      return await catalogApi.searchCatalogObjects(searchRequest);
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async ListCatalogObjects(types: string[], cursor?: string) {
    const catalogApi = this.client.catalogApi;

    const callFxn = async (): Promise<ApiResponse<ListCatalogResponse>> => {
      this.logger.debug({ types, cursor }, 'sending catalog list request');
      return await catalogApi.listCatalog(cursor, types.join(', '));
    };
    return await SquareCallFxnWrapper(callFxn, 0, this.logger);
  }

  async BatchUpsertCatalogObjects(
    objectBatches: CatalogObjectBatch[],
  ): Promise<SquareProviderApiCallReturnValue<BatchUpsertCatalogObjectsResponse>> {
    const catalogApi = this.client.catalogApi;

    let remainingObjects = objectBatches.slice();
    const responses: SquareProviderApiCallReturnSuccess<BatchUpsertCatalogObjectsResponse>[] = [];
    do {
      const leftovers = remainingObjects.splice(
        Math.floor(this.catalogLimits.batchUpsertMaxTotalObjects / this.appConfig.squareBatchChunkSize),
      );
      const idempotency_key = crypto.randomBytes(22).toString('hex');
      const request_body: BatchUpsertCatalogObjectsRequest = {
        idempotencyKey: idempotency_key,
        batches: remainingObjects,
      };

      const callFxn = async (): Promise<ApiResponse<BatchUpsertCatalogObjectsResponse>> => {
        this.logger.debug({ request_body }, 'sending catalog upsert batch');
        return await catalogApi.batchUpsertCatalogObjects(request_body);
      };
      const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
      if (!response.success) {
        return response;
      }
      remainingObjects = leftovers;
      responses.push(response);
    } while (remainingObjects.length > 0);
    return {
      error: responses.flatMap((x) => x.error),
      result: {
        errors: responses.flatMap((x) => x.result.errors ?? []),
        idMappings: responses.flatMap((x) => x.result.idMappings ?? []),
        objects: responses.flatMap((x) => x.result.objects ?? []),
        updatedAt: responses[0].result.updatedAt,
      },
      success: true,
    };
  }

  async BatchDeleteCatalogObjects(
    objectIds: string[],
  ): Promise<SquareProviderApiCallReturnValue<BatchDeleteCatalogObjectsResponse>> {
    const catalogApi = this.client.catalogApi;
    let remainingObjects = objectIds.slice();
    const responses: SquareProviderApiCallReturnSuccess<BatchDeleteCatalogObjectsResponse>[] = [];
    do {
      const leftovers = remainingObjects.splice(this.catalogLimits.batchDeleteMaxObjectIds);
      const request_body: BatchDeleteCatalogObjectsRequest = {
        objectIds: remainingObjects,
      };

      const callFxn = async (): Promise<ApiResponse<BatchDeleteCatalogObjectsResponse>> => {
        this.logger.debug({ request_body }, 'sending catalog delete batch');
        return await catalogApi.batchDeleteCatalogObjects(request_body);
      };
      const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
      if (!response.success) {
        return response;
      }
      remainingObjects = leftovers;
      responses.push(response);
    } while (remainingObjects.length > 0);

    return {
      error: responses.flatMap((x) => x.error),
      result: {
        deletedAt: responses[0].result.deletedAt,
        deletedObjectIds: responses.flatMap((x) => x.result.deletedObjectIds ?? []),
        errors: responses.flatMap((x) => x.result.errors ?? []),
      },
      success: true,
    };
  }

  async BatchRetrieveCatalogObjects(
    objectIds: string[],
    includeRelated: boolean,
  ): Promise<SquareProviderApiCallReturnValue<BatchRetrieveCatalogObjectsResponse>> {
    const catalogApi = this.client.catalogApi;

    let remainingObjects = objectIds.slice();
    const responses: SquareProviderApiCallReturnSuccess<BatchRetrieveCatalogObjectsResponse>[] = [];

    do {
      const leftovers = remainingObjects.splice(this.catalogLimits.batchRetrieveMaxObjectIds);
      const request_body: BatchRetrieveCatalogObjectsRequest = {
        objectIds: remainingObjects,
        includeRelatedObjects: includeRelated,
      };

      const callFxn = async (): Promise<ApiResponse<BatchRetrieveCatalogObjectsResponse>> => {
        this.logger.debug({ request_body }, 'sending catalog retrieve batch');
        return await catalogApi.batchRetrieveCatalogObjects(request_body);
      };
      const response = await SquareCallFxnWrapper(callFxn, 0, this.logger);
      if (!response.success) {
        return response;
      }
      remainingObjects = leftovers;
      responses.push(response);
    } while (remainingObjects.length > 0);

    return {
      error: responses.flatMap((x) => x.error),
      result: {
        objects: responses.flatMap((x) => x.result.objects ?? []),
        relatedObjects: responses.flatMap((x) => x.result.relatedObjects ?? []),
        errors: responses.flatMap((x) => x.result.errors ?? []),
      },
      success: true,
    };
  }

  async SendMessageOrder(order: Order) {
    const sentOrder = await this.CreateOrder(order);
    if (sentOrder.success && sentOrder.result.order?.id) {
      const payment = await this.CreatePayment({
        amount: { currency: CURRENCY.USD, amount: 0 },
        autocomplete: true,
        locationId: order.locationId,
        referenceId: '',
        squareOrderId: sentOrder.result.order.id,
        sourceId: 'CASH',
      });
      if (payment.success) {
        return sentOrder.result;
      }
    }
    return false;
  }
}
