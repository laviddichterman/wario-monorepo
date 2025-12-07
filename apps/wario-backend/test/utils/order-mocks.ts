/**
 * Order Mock Generators
 *
 * Factory functions for creating mock order-related entities in tests.
 * These complement the catalog mocks from @wcp/wario-shared/testing.
 */

import { formatISO } from 'date-fns';

import type {
  CashPaymentAllocated,
  CoreCartEntry,
  CreditPaymentAllocated,
  CustomerInfoData,
  FulfillmentData,
  IMoney,
  MetricsDto,
  OrderLineDiscount,
  OrderManualAmountDiscount,
  OrderTax,
  StoreCreditPaymentAllocated,
  TipSelectionAmount,
  TipSelectionPercentage,
  WCPProductV2Dto,
  WOrderInstance,
} from '@wcp/wario-shared';
import {
  CURRENCY,
  DiscountMethod,
  PaymentMethod,
  TenderBaseStatus,
  WFulfillmentStatus,
  WOrderStatus,
} from '@wcp/wario-shared';

// ============================================================================
// Primitive Helpers
// ============================================================================

export const createMockMoneyBackend = (amount = 0, currency = CURRENCY.USD): IMoney => ({
  amount,
  currency,
});

// ============================================================================
// Customer Info
// ============================================================================

export type CreateMockCustomerInfoOptions = Partial<CustomerInfoData>;

export const createMockCustomerInfo = (
  overrides: CreateMockCustomerInfoOptions = {},
): CustomerInfoData => ({
  givenName: 'John',
  familyName: 'Doe',
  mobileNum: '+15551234567',
  email: 'john.doe@example.com',
  referral: '',
  ...overrides,
});

// ============================================================================
// Fulfillment
// ============================================================================

export type CreateMockFulfillmentOptions = Partial<FulfillmentData>;

export const createMockFulfillmentData = (
  overrides: CreateMockFulfillmentOptions = {},
): FulfillmentData => {
  const now = new Date();
  return {
    status: WFulfillmentStatus.PROPOSED,
    selectedService: 'pickup',
    selectedDate: formatISO(now, { representation: 'date' }),
    selectedTime: now.getTime() + 30 * 60 * 1000, // 30 mins from now
    ...overrides,
  };
};

// ============================================================================
// Cart
// ============================================================================

export interface CreateMockCartEntryOptions {
  quantity?: number;
  categoryId?: string;
  productId?: string;
  modifiers?: WCPProductV2Dto['modifiers'];
}

export const createMockCartEntry = (
  overrides: CreateMockCartEntryOptions = {},
): CoreCartEntry<WCPProductV2Dto> => ({
  quantity: overrides.quantity ?? 1,
  categoryId: overrides.categoryId ?? 'cat1',
  product: {
    pid: overrides.productId ?? 'pi1',
    modifiers: overrides.modifiers ?? [],
  },
});

export const createMockCart = (
  entries: CreateMockCartEntryOptions[] = [{}],
): CoreCartEntry<WCPProductV2Dto>[] => entries.map(createMockCartEntry);

// ============================================================================
// Metrics
// ============================================================================

export const createMockMetrics = (overrides: Partial<MetricsDto> = {}): MetricsDto => {
  const now = Date.now();
  return {
    pageLoadTime: now - 60000,
    numTimeBumps: 0,
    numTipAdjusts: 0,
    numTipFixed: 0,
    timeToFirstProduct: 5000,
    timeToServiceDate: 10000,
    timeToServiceTime: 15000,
    timeToStage: [5000, 10000, 15000, 20000],
    submitTime: now,
    useragent: 'Mozilla/5.0 (Test Agent)',
    ...overrides,
  };
};

// ============================================================================
// Payments
// ============================================================================

export interface CreateMockPaymentOptions {
  amount?: number | IMoney;
  tipAmount?: number;
  processorId?: string;
  status?: TenderBaseStatus.AUTHORIZED | TenderBaseStatus.COMPLETED | TenderBaseStatus.CANCELED;
}

export const createMockCreditPayment = (
  overrides: CreateMockPaymentOptions = {},
): CreditPaymentAllocated => ({
  t: PaymentMethod.CreditCard,
  amount: typeof overrides.amount === 'object' ? overrides.amount : createMockMoneyBackend(overrides.amount ?? 1000),
  tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 150),
  createdAt: Date.now(),
  status: overrides.status ?? TenderBaseStatus.COMPLETED,
  processorId: overrides.processorId ?? `sq-payment-${String(Date.now())}`,
  payment: {
    processor: 'SQUARE',
    receiptUrl: 'https://squareup.com/receipt/test',
    last4: '1234',
    cardBrand: 'VISA',
  },
});

export const createMockCashPayment = (
  overrides: CreateMockPaymentOptions = {},
): CashPaymentAllocated => ({
  t: PaymentMethod.Cash,
  amount: typeof overrides.amount === 'object' ? overrides.amount : createMockMoneyBackend(overrides.amount ?? 1000),
  tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 0),
  createdAt: Date.now(),
  status: overrides.status ?? TenderBaseStatus.COMPLETED,
  processorId: overrides.processorId ?? `cash-${String(Date.now())}`,
  payment: {
    amountTendered: createMockMoneyBackend(typeof overrides.amount === 'number' ? overrides.amount + 500 : (overrides.amount?.amount ?? 1000) + 500),
    change: createMockMoneyBackend(500),
  },
});

export interface CreateMockStoreCreditPaymentOptions extends CreateMockPaymentOptions {
  code?: string;
  balance?: number;
}

export const createMockStoreCreditPayment = (
  overrides: CreateMockStoreCreditPaymentOptions = {},
): StoreCreditPaymentAllocated => ({
  t: PaymentMethod.StoreCredit,
  amount: typeof overrides.amount === 'object' ? overrides.amount : createMockMoneyBackend(overrides.amount ?? 500),
  tipAmount: createMockMoneyBackend(overrides.tipAmount ?? 0),
  createdAt: Date.now(),
  status: overrides.status ?? TenderBaseStatus.COMPLETED,
  processorId: overrides.processorId ?? `sc-${String(Date.now())}`,
  payment: {
    code: overrides.code ?? 'ABC123',
    balance: createMockMoneyBackend(overrides.balance ?? 500),
    lock: {
      iv: 'mock-iv',
      enc: 'mock-encrypted',
      auth: 'mock-auth',
    },
  },
});

// ============================================================================
// Discounts
// ============================================================================

export interface CreateMockDiscountOptions {
  amount?: number;
  reason?: string;
}

export const createMockManualDiscount = (
  overrides: CreateMockDiscountOptions = {},
): OrderManualAmountDiscount => ({
  t: DiscountMethod.ManualAmount,
  createdAt: Date.now(),
  status: TenderBaseStatus.COMPLETED,
  discount: {
    reason: overrides.reason ?? 'Employee discount',
    amount: createMockMoneyBackend(overrides.amount ?? 200),
    balance: createMockMoneyBackend(0),
  },
});

// ============================================================================
// Taxes
// ============================================================================

export const createMockOrderTax = (amount = 87): OrderTax => ({
  amount: createMockMoneyBackend(amount),
});

// ============================================================================
// Tip
// ============================================================================

export const createMockTipPercentage = (percentage = 18): TipSelectionPercentage => ({
  isPercentage: true,
  isSuggestion: true,
  value: percentage,
});

export const createMockTipAmount = (amountValue = 200): TipSelectionAmount => ({
  isPercentage: false,
  isSuggestion: false,
  value: createMockMoneyBackend(amountValue),
});

// ============================================================================
// WOrderInstance
// ============================================================================

export interface CreateMockWOrderInstanceOptions {
  id?: string;
  status?: WOrderStatus;
  customerInfo?: Partial<CustomerInfoData>;
  fulfillment?: Partial<FulfillmentData>;
  cartEntries?: CreateMockCartEntryOptions[];
  cart?: CoreCartEntry<WCPProductV2Dto>[];
  discounts?: OrderLineDiscount[];
  payments?: WOrderInstance['payments'];
  refunds?: WOrderInstance['refunds'];
  taxes?: OrderTax[];
  tip?: TipSelectionPercentage | TipSelectionAmount;
  metrics?: MetricsDto;
  metadata?: WOrderInstance['metadata'];
  specialInstructions?: string;
  locked?: string | null;
}

let orderIdCounter = 0;

export const createMockWOrderInstance = (
  overrides: CreateMockWOrderInstanceOptions = {},
): WOrderInstance => {
  const {
    customerInfo: customerOverrides,
    fulfillment: fulfillmentOverrides,
    cartEntries,
    cart,
    ...directOverrides
  } = overrides;

  const orderId = directOverrides.id ?? `order-${String(++orderIdCounter).padStart(4, '0')}`;

  return {
    id: orderId,
    status: directOverrides.status ?? WOrderStatus.OPEN,
    customerInfo: createMockCustomerInfo(customerOverrides),
    fulfillment: createMockFulfillmentData(fulfillmentOverrides),
    cart: cart ?? (cartEntries ? createMockCart(cartEntries) : createMockCart()),
    discounts: directOverrides.discounts ?? [],
    payments: directOverrides.payments ?? [],
    refunds: directOverrides.refunds ?? [],
    taxes: directOverrides.taxes ?? [createMockOrderTax()],
    tip: directOverrides.tip ?? createMockTipPercentage(),
    metrics: directOverrides.metrics ?? createMockMetrics(),
    metadata: directOverrides.metadata ?? [],
    specialInstructions: directOverrides.specialInstructions ?? '',
    locked: directOverrides.locked ?? null,
  };
};

// ============================================================================
// Order Lifecycle Helpers
// ============================================================================

/**
 * Creates an order in CONFIRMED status with a completed payment.
 */
export const createMockConfirmedOrder = (
  overrides: CreateMockWOrderInstanceOptions = {},
): WOrderInstance =>
  createMockWOrderInstance({
    status: WOrderStatus.CONFIRMED,
    payments: [createMockCreditPayment()],
    fulfillment: {
      status: WFulfillmentStatus.CONFIRMED,
      ...overrides.fulfillment,
    },
    ...overrides,
  });

/**
 * Creates an order in COMPLETED status.
 */
export const createMockCompletedOrder = (
  overrides: CreateMockWOrderInstanceOptions = {},
): WOrderInstance =>
  createMockWOrderInstance({
    status: WOrderStatus.COMPLETED,
    payments: [createMockCreditPayment()],
    fulfillment: {
      status: WFulfillmentStatus.COMPLETED,
      ...overrides.fulfillment,
    },
    ...overrides,
  });

/**
 * Creates a cancelled order with optional refund.
 */
export const createMockCancelledOrder = (
  options: CreateMockWOrderInstanceOptions & { withRefund?: boolean } = {},
): WOrderInstance => {
  const { withRefund = false, ...overrides } = options;
  const payment = createMockCreditPayment();

  return createMockWOrderInstance({
    status: WOrderStatus.CANCELED,
    payments: [payment],
    refunds: withRefund
      ? [{ ...payment, processorId: `refund-${payment.processorId}` }]
      : [],
    fulfillment: {
      status: WFulfillmentStatus.CANCELED,
      ...overrides.fulfillment,
    },
    ...overrides,
  });
};

/**
 * Resets the order ID counter (useful between test suites).
 */
export const resetOrderIdCounter = (): void => {
  orderIdCounter = 0;
};
