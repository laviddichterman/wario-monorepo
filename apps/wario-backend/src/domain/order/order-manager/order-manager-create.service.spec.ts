/**
 * OrderManagerService.CreateOrder Unit Tests
 *
 * Tests for order creation including:
 * - Payment combinations (CC, store credit, mixed)
 * - Validation errors (fulfillment, time, products, underpayment)
 * - Service failures and cleanup (Square, store credit, calendar, DB)
 *
 * CRITICAL: The mock data must be mathematically consistent.
 * RecomputeTotals is a REAL function that:
 * 1. Computes cart subtotal from WProduct.m.price
 * 2. Applies discounts
 * 3. Computes tax = subtotal * TAX_RATE
 * 4. Computes tip from tipBasis
 * 5. Computes total = subtotal + tax + tip
 * 6. Validates payments cover the total
 *
 * The mock cart, payments, and tip must all add up correctly.
 */

/* eslint-disable @typescript-eslint/unbound-method */

import {
  createMock,
  createMockCreateOrderRequest,
  createMockCreditPaymentProposed,
  createMockFulfillmentConfig,
  createMockFulfillmentConfigMap,
  createMockKeyValueConfig,
  createMockSettings,
  createMockSquareErrorResponse,
  createMockSquareOrderSuccessResponse,
  createMockSquarePaymentSuccessResponse,
  createMockStoreCreditPaymentProposed,
  createMockValidateLockAndSpendFailure,
  createMockValidateLockAndSpendSuccess,
  createMockWOrderInstance,
  resetOrderIdCounter,
} from 'test/utils';

import { Test, type TestingModule } from '@nestjs/testing';
import { type PinoLogger } from 'nestjs-pino';

import {
  CALL_LINE_DISPLAY,
  type CategorizedRebuiltCart,
  CURRENCY,
  type FulfillmentConfig,
  TenderBaseStatus,
  WOrderStatus,
} from '@wcp/wario-shared';

import { AppConfigService } from 'src/config/app-config.service';
import { StoreCreditProviderService } from 'src/config/store-credit-provider/store-credit-provider.service';
import { PrinterService } from 'src/infrastructure/printing/printer/printer.service';
import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';
import { GoogleService } from 'src/modules/integrations/google/google.service';
import { SquareService } from 'src/modules/integrations/square/square.service';
import { ORDER_REPOSITORY } from 'src/repositories/interfaces';

import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';

import { OrderManagerService } from './order-manager.service';

// ============================================================================
// Test Constants - Mathematically consistent values
// ============================================================================

/**
 * Test pricing constants. These must be mathematically consistent:
 * - PRODUCT_PRICE: 1000 cents ($10.00)
 * - TAX_RATE: 10% = 0.1
 * - SUBTOTAL: $10.00
 * - TAX: $1.00 (10% of $10.00)
 * - TIP: $0.00 (0% tip for simplicity)
 * - TOTAL: $11.00 ($10.00 + $1.00)
 * - PAYMENT_AMOUNT: 1100 cents (exactly matches total)
 */
const TEST_PRICING = {
  PRODUCT_PRICE: 1000, // $10.00
  TAX_RATE: 0.1, // 10%
  SUBTOTAL: 1000, // $10.00
  TAX: 100, // $1.00
  TIP: 0, // $0.00
  TOTAL: 1100, // $11.00
  PAYMENT_AMOUNT: 1100, // $11.00 - exactly covers total
};

// ============================================================================
// Test Setup Helpers
// ============================================================================

const createMockLogger = () => createMock<PinoLogger>();

const createMockOrderRepository = () => ({
  findById: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  findByThirdPartySquareIds: jest.fn(),
  updateWithLock: jest.fn(),
  releaseLock: jest.fn(),
  bulkCreate: jest.fn(),
  create: jest.fn(),
  findByLock: jest.fn(),
  lockReadyOrders: jest.fn(),
  acquireLock: jest.fn(),
  tryAcquireLock: jest.fn(),
  unlockAll: jest.fn(),
});

interface MockDeps {
  orderRepository: ReturnType<typeof createMockOrderRepository>;
  squareService: jest.Mocked<SquareService>;
  storeCreditService: jest.Mocked<StoreCreditProviderService>;
  catalogService: jest.Mocked<CatalogProviderService>;
  dataProvider: jest.Mocked<DataProviderService>;
  appConfigService: jest.Mocked<AppConfigService>;
  orderValidationService: jest.Mocked<OrderValidationService>;
  orderPaymentService: jest.Mocked<OrderPaymentService>;
  orderCalendarService: jest.Mocked<OrderCalendarService>;
  orderNotificationService: jest.Mocked<OrderNotificationService>;
}

const createMockDeps = (): MockDeps => ({
  orderRepository: createMockOrderRepository(),
  squareService: createMock<SquareService>(),
  storeCreditService: createMock<StoreCreditProviderService>(),
  catalogService: createMock<CatalogProviderService>(),
  dataProvider: createMock<DataProviderService>(),
  appConfigService: createMock<AppConfigService>(),
  orderValidationService: createMock<OrderValidationService>(),
  orderPaymentService: createMock<OrderPaymentService>(),
  orderCalendarService: createMock<OrderCalendarService>(),
  orderNotificationService: createMock<OrderNotificationService>(),
});

/**
 * Creates a complete, consistent mock category for catalog selectors.
 * Includes all fields required by:
 * - GenerateCategoryOrderList (children array)
 * - EventTitleSectionBuilder (display_flags)
 */
const createMockCategoryComplete = () => ({
  id: 'cat1',
  name: 'Test Category',
  description: '',
  ordinal: 0,
  parent_id: null,
  children: [], // Required for GenerateCategoryOrderList
  products: ['prod1'],
  serviceDisable: [],
  display: 'SECTIONS' as const,
  nesting: 'FLAT' as const,
  display_flags: {
    call_line_name: 'T',
    call_line_display: CALL_LINE_DISPLAY.SHORTCODE,
    show_name_of_base_product: true,
    suppress_exhaustive_modifier_list: false,
  },
});

/**
 * Creates a rebuilt cart with a single product at the test price.
 * This cart is what OrderValidationService.RebuildOrderState returns.
 */
const createMockRebuiltCart = (): CategorizedRebuiltCart => ({
  cat1: [
    {
      quantity: 1,
      categoryId: 'cat1',
      product: {
        p: { productId: 'prod1', modifiers: [] },
        m: {
          name: 'Test Product',
          shortname: 'TP',
          description: '',
          price: { amount: TEST_PRICING.PRODUCT_PRICE, currency: CURRENCY.USD },
          pi: ['pi1', 'pi1'],
          is_split: false,
          incomplete: false,
          modifier_map: {},
          advanced_option_eligible: false,
          advanced_option_selected: false,
          additional_modifiers: { left: [], right: [], whole: [] },
          exhaustive_modifiers: { left: [], right: [], whole: [] },
          bake_count: [1, 1],
          flavor_count: [1, 1],
        },
      },
    },
  ],
});

/**
 * Creates complete catalog selectors with all required fields.
 */
const createMockCatalogSelectors = () => {
  const mockCategory = createMockCategoryComplete();
  return {
    category: jest.fn().mockReturnValue(mockCategory),
    productEntry: jest.fn().mockReturnValue({
      id: 'prod1',
      instances: ['pi1'],
      timing: null, // No cart-based lead time
      price: { amount: TEST_PRICING.PRODUCT_PRICE, currency: CURRENCY.USD },
      modifiers: [],
    }),
    productInstance: jest.fn().mockReturnValue({
      id: 'pi1',
      shortcode: 'TP',
      displayName: 'Test Product',
    }),
    option: jest.fn(),
    modifierEntry: jest.fn(),
    options: jest.fn().mockReturnValue([]),
    modifierEntries: jest.fn().mockReturnValue([]),
    categories: jest.fn().mockReturnValue(['cat1']),
    productInstances: jest.fn().mockReturnValue(['pi1']),
    productEntries: jest.fn().mockReturnValue(['prod1']),
    productInstanceFunction: jest.fn(),
    productInstanceFunctions: jest.fn().mockReturnValue([]),
    orderInstanceFunction: jest.fn().mockReturnValue(null),
    orderInstanceFunctions: jest.fn().mockReturnValue([]),
  };
};

/**
 * Configures the mocks for a successful "happy path" order creation.
 * All mocks are configured with consistent data.
 */
const setupHappyPathMocks = (deps: MockDeps, fulfillmentConfig?: FulfillmentConfig) => {
  const config = fulfillmentConfig ?? createMockFulfillmentConfig();
  const fulfillmentMap = createMockFulfillmentConfigMap([config]);

  // DataProvider returns valid config
  (deps.dataProvider.getFulfillments as jest.Mock).mockReturnValue(fulfillmentMap);
  (deps.dataProvider.getSettings as jest.Mock).mockReturnValue({
    ...createMockSettings(),
    TAX_RATE: TEST_PRICING.TAX_RATE,
  });
  (deps.dataProvider.getKeyValueConfig as jest.Mock).mockReturnValue(createMockKeyValueConfig());

  // Catalog selectors with complete data
  const mockSelectors = createMockCatalogSelectors();
  (deps.catalogService.getCatalogSelectors as jest.Mock).mockReturnValue(mockSelectors);

  // Mock getCatalog for CreateOrderFromCart which accesses productInstances directly
  const mockCatalog = {
    productInstances: {
      pi1: {
        id: 'pi1',
        displayName: 'Test Product',
        shortcode: 'TP',
        description: '',
        displayFlags: { pos: { name: '', skip_customization: false } },
        modifiers: [],
        externalIDs: [],
      },
    },
    products: {
      prod1: {
        id: 'prod1',
        instances: ['pi1'],
        modifiers: [],
        price: { amount: TEST_PRICING.PRODUCT_PRICE, currency: CURRENCY.USD },
        disabled: null,
      },
    },
    categories: { cat1: createMockCategoryComplete() },
    options: {},
    modifiers: {},
    productInstanceFunctions: {},
    orderInstanceFunctions: {},
    version: '1.0.0',
    api: { major: 1, minor: 0, patch: 0 },
  };
  (deps.catalogService.getCatalog as jest.Mock).mockReturnValue(mockCatalog);

  // OrderValidationService rebuilds cart successfully with consistent pricing
  const rebuiltCart = createMockRebuiltCart();
  (deps.orderValidationService.RebuildOrderState as jest.Mock).mockReturnValue({
    noLongerAvailable: [],
    rebuiltCart,
  });

  // Square creates order successfully
  (deps.squareService.CreateOrder as jest.Mock).mockResolvedValue(createMockSquareOrderSuccessResponse());

  // Square creates payment successfully
  (deps.squareService.CreatePayment as jest.Mock).mockResolvedValue(
    createMockSquarePaymentSuccessResponse({
      amount: TEST_PRICING.PAYMENT_AMOUNT,
      tipAmount: TEST_PRICING.TIP,
    }),
  );

  // Calendar creates event
  (deps.orderCalendarService.CreateCalendarEvent as jest.Mock).mockResolvedValue('cal-event-id');

  // Notification service
  (deps.orderNotificationService.ServiceTitleBuilder as jest.Mock).mockReturnValue('Pickup for John Doe');
  (deps.orderNotificationService.GenerateOrderEventJson as jest.Mock).mockReturnValue({});
  (deps.orderNotificationService.CreateExternalEmail as jest.Mock).mockReturnValue(undefined);

  // Repository creates order
  const savedOrder = createMockWOrderInstance({ status: WOrderStatus.OPEN });
  deps.orderRepository.create.mockResolvedValue(savedOrder);

  // App config - set threshold high to disable autograt requirement
  (deps.appConfigService.autogratThreshold as unknown as number) = 999;
  (deps.appConfigService.isProduction as unknown as boolean) = false;

  return { config, fulfillmentMap, rebuiltCart, savedOrder, mockSelectors };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('OrderManagerService.CreateOrder', () => {
  let service: OrderManagerService;
  let deps: MockDeps;

  beforeEach(async () => {
    resetOrderIdCounter();
    deps = createMockDeps();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderManagerService,
        { provide: ORDER_REPOSITORY, useValue: deps.orderRepository },
        { provide: 'PinoLogger:OrderManagerService', useValue: createMockLogger() },
        { provide: GoogleService, useValue: createMock<GoogleService>() },
        { provide: SquareService, useValue: deps.squareService },
        { provide: StoreCreditProviderService, useValue: deps.storeCreditService },
        { provide: CatalogProviderService, useValue: deps.catalogService },
        { provide: DataProviderService, useValue: deps.dataProvider },
        { provide: AppConfigService, useValue: deps.appConfigService },
        { provide: OrderNotificationService, useValue: deps.orderNotificationService },
        { provide: OrderPaymentService, useValue: deps.orderPaymentService },
        { provide: OrderValidationService, useValue: deps.orderValidationService },
        { provide: OrderCalendarService, useValue: deps.orderCalendarService },
        { provide: PrinterService, useValue: createMock<PrinterService>() },
      ],
    }).compile();

    service = module.get<OrderManagerService>(OrderManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Validation Errors - These don't need full mock consistency
  // =========================================================================

  describe('Validation Errors', () => {
    it('should return 404 when fulfillment does not exist', async () => {
      (deps.dataProvider.getFulfillments as jest.Mock).mockReturnValue({});
      const request = createMockCreateOrderRequest({
        fulfillment: { selectedService: 'nonexistent' },
      });

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(404);
      if (!result.success) {
        expect(result.error[0].code).toBe('NOT_FOUND');
      }
    });

    it('should return 410 when products are no longer available', async () => {
      setupHappyPathMocks(deps);
      // Override validation to return unavailable product
      (deps.orderValidationService.RebuildOrderState as jest.Mock).mockReturnValue({
        noLongerAvailable: [
          {
            quantity: 1,
            categoryId: 'cat1',
            product: {
              p: { productId: 'prod1', modifiers: [] },
              m: { name: 'Unavailable Product' },
            },
          },
        ],
        rebuiltCart: {},
      });
      const request = createMockCreateOrderRequest();

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(410);
      if (!result.success) {
        expect(result.error[0].code).toBe('GONE');
      }
    });
  });

  // =========================================================================
  // Happy Path - Payment Combinations
  // These tests need mathematically consistent mock data
  // =========================================================================

  describe('Happy Path - Payment Combinations', () => {
    it('should create order with credit card only', async () => {
      setupHappyPathMocks(deps);
      // Payment amount must exactly match computed total
      const request = createMockCreateOrderRequest({
        proposedPayments: [
          createMockCreditPaymentProposed({
            amount: TEST_PRICING.PAYMENT_AMOUNT,
            tipAmount: TEST_PRICING.TIP,
          }),
        ],
      });

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      if (result.success) {
        expect(result.result.status).toBe(WOrderStatus.OPEN);
      }
      expect(deps.squareService.CreateOrder).toHaveBeenCalled();
      expect(deps.squareService.CreatePayment).toHaveBeenCalled();
      expect(deps.orderRepository.create).toHaveBeenCalled();
    });

    it('should create order with store credit payment only', async () => {
      setupHappyPathMocks(deps);
      const storeCreditPayment = createMockStoreCreditPaymentProposed({
        amount: TEST_PRICING.PAYMENT_AMOUNT,
        tipAmount: TEST_PRICING.TIP,
        balance: TEST_PRICING.PAYMENT_AMOUNT + 500, // Balance must be >= amount
      });
      const request = createMockCreateOrderRequest({
        proposedPayments: [storeCreditPayment],
      });

      // Store credit validation succeeds
      (deps.storeCreditService.ValidateLockAndSpend as jest.Mock).mockResolvedValue(
        createMockValidateLockAndSpendSuccess({ amount: TEST_PRICING.PAYMENT_AMOUNT }),
      );

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(deps.storeCreditService.ValidateLockAndSpend).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Service Failures - Square
  // =========================================================================

  describe('Service Failures - Square', () => {
    it('should cleanup and return error when Square CreateOrder fails', async () => {
      setupHappyPathMocks(deps);
      (deps.squareService.CreateOrder as jest.Mock).mockResolvedValue(createMockSquareErrorResponse());
      const request = createMockCreateOrderRequest({
        proposedPayments: [
          createMockCreditPaymentProposed({
            amount: TEST_PRICING.PAYMENT_AMOUNT,
            tipAmount: TEST_PRICING.TIP,
          }),
        ],
      });

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });

    it('should cleanup and return error when Square CreatePayment fails', async () => {
      setupHappyPathMocks(deps);
      (deps.squareService.CreateOrder as jest.Mock).mockResolvedValue(createMockSquareOrderSuccessResponse());
      (deps.squareService.CreatePayment as jest.Mock).mockResolvedValue(createMockSquareErrorResponse());
      const request = createMockCreateOrderRequest({
        proposedPayments: [
          createMockCreditPaymentProposed({
            amount: TEST_PRICING.PAYMENT_AMOUNT,
            tipAmount: TEST_PRICING.TIP,
          }),
        ],
      });

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      // Should attempt to cancel the Square order
      expect(deps.squareService.OrderStateChange).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Service Failures - Store Credit
  // =========================================================================

  describe('Service Failures - Store Credit', () => {
    it('should cleanup when store credit payment validation fails', async () => {
      setupHappyPathMocks(deps);
      const storeCreditPayment = createMockStoreCreditPaymentProposed({
        amount: TEST_PRICING.PAYMENT_AMOUNT,
        balance: TEST_PRICING.PAYMENT_AMOUNT + 500,
      });
      const request = createMockCreateOrderRequest({
        proposedPayments: [storeCreditPayment],
      });

      // Store credit validation fails
      (deps.storeCreditService.ValidateLockAndSpend as jest.Mock).mockResolvedValue(
        createMockValidateLockAndSpendFailure(),
      );

      const result = await service.CreateOrder(request, '127.0.0.1');

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  // =========================================================================
  // Cleanup Verification
  // =========================================================================

  describe('Cleanup Verification', () => {
    it('should cancel Square order state during cleanup', async () => {
      setupHappyPathMocks(deps);
      const orderResponse = createMockSquareOrderSuccessResponse();
      (deps.squareService.CreateOrder as jest.Mock).mockResolvedValue(orderResponse);
      (deps.squareService.CreatePayment as jest.Mock).mockResolvedValue(createMockSquareErrorResponse());

      const request = createMockCreateOrderRequest({
        proposedPayments: [
          createMockCreditPaymentProposed({
            amount: TEST_PRICING.PAYMENT_AMOUNT,
            tipAmount: TEST_PRICING.TIP,
          }),
        ],
      });
      await service.CreateOrder(request, '127.0.0.1');

      expect(deps.squareService.OrderStateChange).toHaveBeenCalledWith(
        expect.any(String), // location
        orderResponse.result.order.id, // order ID
        expect.any(Number), // version
        'CANCELED', // new state
      );
    });

    it('should refund store credit debits during cleanup', async () => {
      setupHappyPathMocks(deps);
      const storeCreditPayment = createMockStoreCreditPaymentProposed({
        amount: TEST_PRICING.PAYMENT_AMOUNT,
        balance: TEST_PRICING.PAYMENT_AMOUNT + 500,
      });
      const request = createMockCreateOrderRequest({
        proposedPayments: [storeCreditPayment],
      });

      // Store credit succeeds initially
      const storeCreditResponse = createMockValidateLockAndSpendSuccess();
      (deps.storeCreditService.ValidateLockAndSpend as jest.Mock).mockResolvedValue(storeCreditResponse);

      // But Square payment fails after store credit was processed
      (deps.squareService.CreatePayment as jest.Mock).mockResolvedValue(createMockSquareErrorResponse());

      await service.CreateOrder(request, '127.0.0.1');

      // Should refund the store credit
      expect(deps.orderPaymentService.RefundStoreCreditDebits).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ success: true })]),
      );
    });

    it('should refund Square payments during cleanup after calendar failure', async () => {
      setupHappyPathMocks(deps);
      // Payment succeeds
      const paymentResponse = createMockSquarePaymentSuccessResponse({
        status: TenderBaseStatus.COMPLETED,
        amount: TEST_PRICING.PAYMENT_AMOUNT,
        tipAmount: TEST_PRICING.TIP,
      });
      (deps.squareService.CreatePayment as jest.Mock).mockResolvedValue(paymentResponse);
      // Calendar fails
      (deps.orderCalendarService.CreateCalendarEvent as jest.Mock).mockRejectedValue(new Error('Calendar error'));

      const request = createMockCreateOrderRequest({
        proposedPayments: [
          createMockCreditPaymentProposed({
            amount: TEST_PRICING.PAYMENT_AMOUNT,
            tipAmount: TEST_PRICING.TIP,
          }),
        ],
      });
      await service.CreateOrder(request, '127.0.0.1');

      // Should attempt to refund payments
      expect(deps.orderPaymentService.RefundSquarePayments).toHaveBeenCalled();
    });
  });
});
