/**
 * CreateOrder Mock Generators
 *
 * Factory functions for creating mock CreateOrderRequestV2 and related data.
 * Used for testing OrderManagerService.CreateOrder.
 */

import type {
  CreateOrderRequestV2,
  CreditPaymentAllocated,
  CreditPaymentProposed,
  FulfillmentConfig,
  FulfillmentData,
  FulfillmentMessages,
  FulfillmentTime,
  IWInterval,
  OperatingHourSpecification,
  OrderLineDiscountCodeAmount,
  StoreCreditPaymentProposed,
  ValidateLockAndSpendSuccess,
  WCPProductV2Dto,
} from '@wcp/wario-shared';
import {
  DayOfTheWeek,
  DiscountMethod,
  FulfillmentType,
  PaymentMethod,
  TenderBaseStatus,
  WDateUtils,
  WFulfillmentStatus,
} from '@wcp/wario-shared';

import {
  createMockCustomerInfo,
  createMockMetrics,
  createMockMoneyBackend,
  createMockTipPercentage,
} from './order-mocks';

// ============================================================================
// Fulfillment Config
// ============================================================================

/**
 * Creates operating hours that are open all day, every day.
 */
export const createOpenAllDayHours = (): OperatingHourSpecification => ({
  [DayOfTheWeek.SUNDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.MONDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.TUESDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.WEDNESDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.THURSDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.FRIDAY]: [{ start: 0, end: 1440 }],
  [DayOfTheWeek.SATURDAY]: [{ start: 0, end: 1440 }],
});

/**
 * Creates default fulfillment messages.
 */
export const createMockFulfillmentMessages = (): FulfillmentMessages => ({
  CONFIRMATION: 'Thank you for your order!',
  INSTRUCTIONS: 'Please arrive at the scheduled time.',
  DESCRIPTION: null,
});

export interface CreateMockFulfillmentConfigOptions {
  id?: string;
  displayName?: string;
  service?: FulfillmentType;
  operatingHours?: OperatingHourSpecification;
  specialHours?: { key: string; value: IWInterval[] }[];
  blockedOff?: { key: string; value: IWInterval[] }[];
  leadTime?: number;
  leadTimeOffset?: number;
  timeStep?: number;
  maxDuration?: number;
  minDuration?: number;
  orderBaseCategoryId?: string;
  orderSupplementaryCategoryId?: string | null;
}

export const createMockFulfillmentConfig = (overrides: CreateMockFulfillmentConfigOptions = {}): FulfillmentConfig => ({
  id: overrides.id ?? 'pickup',
  shortcode: 'PU',
  displayName: overrides.displayName ?? 'Pickup',
  ordinal: 0,
  service: overrides.service ?? FulfillmentType.PickUp,
  operatingHours: overrides.operatingHours ?? createOpenAllDayHours(),
  specialHours: overrides.specialHours ?? [],
  blockedOff: overrides.blockedOff ?? [],
  leadTime: overrides.leadTime ?? 0,
  leadTimeOffset: overrides.leadTimeOffset ?? 0,
  timeStep: overrides.timeStep ?? 15,
  minDuration: overrides.minDuration ?? 0,
  maxDuration: overrides.maxDuration ?? 60,
  orderBaseCategoryId: overrides.orderBaseCategoryId ?? 'cat1',
  orderSupplementaryCategoryId: overrides.orderSupplementaryCategoryId ?? null,
  exposeFulfillment: true,
  allowTipping: true,
  allowPrepayment: true,
  messages: createMockFulfillmentMessages(),
  menuBaseCategoryId: 'cat1',
  requirePrepayment: true,
  terms: [],
});

export type FulfillmentConfigMap = Record<string, FulfillmentConfig>;

/**
 * Creates a map of fulfillment configs keyed by ID.
 */
export const createMockFulfillmentConfigMap = (
  configs: FulfillmentConfig[] = [createMockFulfillmentConfig()],
): FulfillmentConfigMap => Object.fromEntries(configs.map((c) => [c.id, c]));

// ============================================================================
// Settings & Key Value Config
// ============================================================================

export interface CreateMockSettingsOptions {
  TAX_RATE?: number;
  ALLOW_ADVANCED?: boolean;
}

export const createMockSettings = (overrides: CreateMockSettingsOptions = {}) => ({
  TAX_RATE: overrides.TAX_RATE ?? 0.1,
  ALLOW_ADVANCED: overrides.ALLOW_ADVANCED ?? true,
});

export interface CreateMockKeyValueConfigReturnType {
  SQUARE_LOCATION: string;
  STORE_NAME: string;
  EMAIL_ADDRESS: string;
}

export const createMockKeyValueConfig = (
  overrides: Partial<CreateMockKeyValueConfigReturnType> = {},
): CreateMockKeyValueConfigReturnType => ({
  SQUARE_LOCATION: overrides.SQUARE_LOCATION ?? 'LOCATION_ID',
  STORE_NAME: overrides.STORE_NAME ?? 'Test Store',
  EMAIL_ADDRESS: overrides.EMAIL_ADDRESS ?? 'test@store.com',
});

// ============================================================================
// Proposed Payments
// ============================================================================

export interface CreateMockCreditPaymentProposedOptions {
  amount?: number;
  tipAmount?: number;
  sourceId?: string;
}

export const createMockCreditPaymentProposed = (
  overrides: CreateMockCreditPaymentProposedOptions = {},
): CreditPaymentProposed => ({
  t: PaymentMethod.CreditCard,
  amount: createMockMoneyBackend(overrides.amount ?? 1000),
  tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 100),
  createdAt: Date.now(),
  status: TenderBaseStatus.PROPOSED,
  payment: {
    sourceId: overrides.sourceId ?? 'cnon:card-nonce-ok',
  },
});

export interface CreateMockStoreCreditPaymentProposedOptions {
  amount?: number;
  tipAmount?: number;
  code?: string;
  balance?: number;
}

export const createMockStoreCreditPaymentProposed = (
  overrides: CreateMockStoreCreditPaymentProposedOptions = {},
): StoreCreditPaymentProposed => ({
  t: PaymentMethod.StoreCredit,
  amount: createMockMoneyBackend(overrides.amount ?? 500),
  tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 0),
  createdAt: Date.now(),
  status: TenderBaseStatus.PROPOSED,
  payment: {
    code: overrides.code ?? 'SC-ABC123',
    balance: createMockMoneyBackend(overrides.balance ?? 1000),
    lock: {
      iv: 'mock-iv',
      enc: 'mock-enc',
      auth: 'mock-auth',
    },
  },
});

// ============================================================================
// Proposed Discounts
// ============================================================================

export interface CreateMockCreditCodeAmountDiscountOptions {
  amount?: number;
  code?: string;
  balance?: number;
}

/**
 * Creates a proposed store credit discount (CreditCodeAmount type).
 * Note: Uses TenderBaseStatus.PROPOSED but cast to COMPLETED since the type requires non-PROPOSED status.
 */
export const createMockCreditCodeAmountDiscount = (
  overrides: CreateMockCreditCodeAmountDiscountOptions = {},
): OrderLineDiscountCodeAmount => ({
  t: DiscountMethod.CreditCodeAmount,
  createdAt: Date.now(),
  status: TenderBaseStatus.COMPLETED,
  discount: {
    code: overrides.code ?? 'DISC-XYZ789',
    amount: createMockMoneyBackend(overrides.amount ?? 200),
    balance: createMockMoneyBackend(overrides.balance ?? 500),
    lock: {
      iv: 'mock-iv',
      enc: 'mock-enc',
      auth: 'mock-auth',
    },
  },
});

// ============================================================================
// Cart
// ============================================================================

export interface CreateMockCartEntryV2Options {
  quantity?: number;
  categoryId?: string;
  productId?: string;
  modifiers?: WCPProductV2Dto['modifiers'];
}

export const createMockCartEntryV2 = (
  overrides: CreateMockCartEntryV2Options = {},
): { quantity: number; categoryId: string; product: WCPProductV2Dto } => ({
  quantity: overrides.quantity ?? 1,
  categoryId: overrides.categoryId ?? 'cat1',
  product: {
    pid: overrides.productId ?? 'pi1',
    modifiers: overrides.modifiers ?? [],
  },
});

// ============================================================================
// CreateOrderRequestV2
// ============================================================================

export interface CreateMockCreateOrderRequestOptions {
  customerInfo?: Parameters<typeof createMockCustomerInfo>[0];
  fulfillment?: Partial<FulfillmentData>;
  cart?: ReturnType<typeof createMockCartEntryV2>[];
  proposedPayments?: (CreditPaymentProposed | StoreCreditPaymentProposed)[];
  proposedDiscounts?: OrderLineDiscountCodeAmount[];
  tip?: CreateOrderRequestV2['tip'];
  metrics?: Parameters<typeof createMockMetrics>[0];
  specialInstructions?: string;
}

/**
 * Creates a valid CreateOrderRequestV2 for testing.
 * Defaults to a simple order with one product and a credit card payment.
 */
export const createMockCreateOrderRequest = (
  overrides: CreateMockCreateOrderRequestOptions = {},
): CreateOrderRequestV2 => {
  const now = new Date();
  // Calculate time aligned to 15-minute step, at least 15 minutes in the future
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const alignedTime = Math.ceil((currentMinutes + 15) / 15) * 15; // Round up to next 15-min slot
  const defaultFulfillmentTime: FulfillmentTime = {
    selectedDate: WDateUtils.formatISODate(now),
    selectedTime: alignedTime,
  };

  const fulfillmentData: FulfillmentData = {
    status: WFulfillmentStatus.PROPOSED,
    selectedService: 'pickup',
    ...defaultFulfillmentTime,
    ...overrides.fulfillment,
  };

  return {
    customerInfo: createMockCustomerInfo(overrides.customerInfo),
    fulfillment: fulfillmentData,
    cart: overrides.cart ?? [createMockCartEntryV2()],
    proposedPayments: overrides.proposedPayments ?? [createMockCreditPaymentProposed()],
    proposedDiscounts: overrides.proposedDiscounts ?? [],
    tip: overrides.tip ?? createMockTipPercentage(0),
    metrics: createMockMetrics(overrides.metrics) as CreateOrderRequestV2['metrics'],
    specialInstructions: overrides.specialInstructions,
  };
};

// ============================================================================
// Square Response Mocks
// ============================================================================

export interface CreateMockSquareOrderResponseOptions {
  orderId?: string;
  version?: number;
}

export const createMockSquareOrderSuccessResponse = (overrides: CreateMockSquareOrderResponseOptions = {}) => ({
  success: true as const,
  result: {
    order: {
      id: overrides.orderId ?? `sq-order-${String(Date.now())}`,
      version: overrides.version ?? 1,
      locationId: 'LOCATION_ID',
      state: 'OPEN',
      fulfillments: [],
    },
  },
  error: [],
});

export interface CreateMockSquarePaymentResponseOptions {
  processorId?: string;
  amount?: number;
  tipAmount?: number;
  status?: TenderBaseStatus.AUTHORIZED | TenderBaseStatus.COMPLETED | TenderBaseStatus.CANCELED;
}

export const createMockSquarePaymentSuccessResponse = (
  overrides: CreateMockSquarePaymentResponseOptions = {},
): { success: true; result: CreditPaymentAllocated; error: [] } => ({
  success: true as const,
  result: {
    t: PaymentMethod.CreditCard,
    amount: createMockMoneyBackend(overrides.amount ?? 1000),
    tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 100),
    createdAt: Date.now(),
    status: overrides.status ?? TenderBaseStatus.AUTHORIZED,
    processorId: overrides.processorId ?? `sq-payment-${String(Date.now())}`,
    payment: {
      processor: 'SQUARE',
      receiptUrl: 'https://squareup.com/receipt/test',
      last4: '1234',
      cardBrand: 'VISA',
    },
  },
  error: [],
});

export interface SquareErrorMock {
  category: string;
  code: string;
  detail?: string;
}

export const createMockSquareErrorResponse = (
  errors: SquareErrorMock[] = [{ category: 'API_ERROR', code: 'GENERIC_ERROR', detail: 'Mock error' }],
) => ({
  success: false as const,
  result: null,
  error: errors,
});

// ============================================================================
// Store Credit Response Mocks
// ============================================================================

export interface CreateMockValidateLockAndSpendSuccessOptions {
  code?: string;
  amount?: number;
  index?: number;
}

export const createMockValidateLockAndSpendSuccess = (
  overrides: CreateMockValidateLockAndSpendSuccessOptions = {},
): ValidateLockAndSpendSuccess => ({
  success: true,
  entry: [
    overrides.code ?? 'SC-ABC123',
    createMockMoneyBackend(overrides.amount ?? 500),
    createMockMoneyBackend(0),
    { iv: 'iv', enc: 'enc', auth: 'auth' },
  ],
  index: overrides.index ?? 0,
});

export const createMockValidateLockAndSpendFailure = () => ({
  success: false as const,
  message: 'Invalid store credit code',
});
