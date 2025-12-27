/**
 * OrderManagerService Unit Tests
 *
 * Tests for the core order management logic including:
 * - GetOrder / GetOrders (querying)
 * - AdjustLockedOrderTime (reschedule with/without customer email)
 */
/* eslint-disable @typescript-eslint/unbound-method */

import {
  createMock,
  createMockFulfillmentConfig,
  createMockFulfillmentConfigMap,
  createMockKeyValueConfig,
  createMockSettings,
  createMockSquareOrderSuccessResponse,
  createMockWOrderInstance,
  resetOrderIdCounter,
} from 'test/utils';

import { Test, type TestingModule } from '@nestjs/testing';
import { type PinoLogger } from 'nestjs-pino';

import {
  CALL_LINE_DISPLAY,
  CURRENCY,
  type FulfillmentConfig,
  type FulfillmentData,
  FulfillmentType,
  WFulfillmentStatus,
  WOrderStatus,
  WSeatingStatus,
} from '@wcp/wario-shared';

import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { DataProviderService } from 'src/modules/data-provider/data-provider.service';
import { GoogleService } from 'src/modules/integrations/google/google.service';
import { SquareService } from 'src/modules/integrations/square/square.service';

import { AppConfigService } from '../../../config/app-config.service';
import { StoreCreditProviderService } from '../../../config/store-credit-provider/store-credit-provider.service';
import { PrinterService } from '../../../infrastructure/printing/printer/printer.service';
import { ORDER_REPOSITORY } from '../../../repositories/interfaces';
import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';

import { OrderManagerService } from './order-manager.service';

// ============================================================================
// Test Setup Helpers (following CreateOrder test patterns)
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
  catalogService: jest.Mocked<CatalogProviderService>;
  dataProvider: jest.Mocked<DataProviderService>;
  appConfigService: jest.Mocked<AppConfigService>;
  orderNotificationService: jest.Mocked<OrderNotificationService>;
  orderCalendarService: jest.Mocked<OrderCalendarService>;
  printerService: jest.Mocked<PrinterService>;
}

const createMockDeps = (): MockDeps => ({
  orderRepository: createMockOrderRepository(),
  squareService: createMock<SquareService>(),
  catalogService: createMock<CatalogProviderService>(),
  dataProvider: createMock<DataProviderService>(),
  appConfigService: createMock<AppConfigService>(),
  orderNotificationService: createMock<OrderNotificationService>(),
  orderCalendarService: createMock<OrderCalendarService>(),
  printerService: createMock<PrinterService>(),
});

/**
 * Creates a complete mock category for catalog selectors.
 * Required by GenerateCategoryOrderList (children array) and EventTitleSectionBuilder (display_flags).
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
 * Creates complete catalog selectors for AdjustLockedOrderTime tests.
 */
const createMockCatalogSelectors = () => {
  const mockCategory = createMockCategoryComplete();
  return {
    category: jest.fn().mockReturnValue(mockCategory),
    productEntry: jest.fn().mockReturnValue({
      id: 'prod1',
      instances: ['pi1'],
      timing: null,
      price: { amount: 1000, currency: CURRENCY.USD },
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
 * Configures mocks for AdjustLockedOrderTime tests with proper catalog data.
 */
const setupAdjustTimeMocks = (deps: MockDeps, fulfillmentConfig?: FulfillmentConfig) => {
  const config = fulfillmentConfig ?? createMockFulfillmentConfig();
  const fulfillmentMap = createMockFulfillmentConfigMap([config]);

  // DataProvider
  (deps.dataProvider.getFulfillments as jest.Mock).mockReturnValue(fulfillmentMap);
  (deps.dataProvider.getSettings as jest.Mock).mockReturnValue({
    ...createMockSettings(),
    TAX_RATE: 0.1,
  });
  (deps.dataProvider.getKeyValueConfig as jest.Mock).mockReturnValue(createMockKeyValueConfig());

  // Catalog selectors
  const mockSelectors = createMockCatalogSelectors();
  (deps.catalogService.getCatalogSelectors as jest.Mock).mockReturnValue(mockSelectors);

  // Catalog with products for RebuildAndSortCart
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
        price: { amount: 1000, currency: CURRENCY.USD },
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

  // Square mocks
  (deps.squareService.RetrieveOrder as jest.Mock).mockResolvedValue(createMockSquareOrderSuccessResponse());
  (deps.squareService.OrderUpdate as jest.Mock).mockResolvedValue({ success: true, result: {}, error: [] });

  // Calendar mocks
  (deps.orderCalendarService.ModifyCalendarEvent as jest.Mock).mockResolvedValue(undefined);

  // Notification mocks
  (deps.orderNotificationService.GenerateOrderEventJson as jest.Mock).mockReturnValue({});

  // Printer mocks
  (deps.printerService.SendTimeChangeTicket as jest.Mock).mockResolvedValue({ success: true, squareOrderIds: [] });

  // AppConfig - set autogratThreshold as property
  Object.defineProperty(deps.appConfigService, 'autogratThreshold', {
    get: () => 6,
    configurable: true,
  });

  return { config, fulfillmentMap, mockSelectors };
};

describe('OrderManagerService', () => {
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
        { provide: StoreCreditProviderService, useValue: createMock<StoreCreditProviderService>() },
        { provide: CatalogProviderService, useValue: deps.catalogService },
        { provide: DataProviderService, useValue: deps.dataProvider },
        { provide: AppConfigService, useValue: deps.appConfigService },
        { provide: OrderNotificationService, useValue: deps.orderNotificationService },
        { provide: OrderPaymentService, useValue: createMock<OrderPaymentService>() },
        { provide: OrderValidationService, useValue: createMock<OrderValidationService>() },
        { provide: OrderCalendarService, useValue: deps.orderCalendarService },
        { provide: PrinterService, useValue: deps.printerService },
      ],
    }).compile();

    service = module.get<OrderManagerService>(OrderManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GetOrder Tests
  // =========================================================================

  describe('GetOrder', () => {
    it('should return order when found', async () => {
      const mockOrder = createMockWOrderInstance({ id: 'order-123' });
      deps.orderRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.GetOrder('order-123');

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.id).toBe('order-123');
      }
    });

    it('should return 404 when order not found', async () => {
      deps.orderRepository.findById.mockResolvedValue(null);

      const result = await service.GetOrder('nonexistent-order');

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].code).toBe('NOT_FOUND');
      }
    });

    it('should return 500 on database error', async () => {
      deps.orderRepository.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.GetOrder('order-123');

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // GetOrders Tests
  // =========================================================================

  describe('GetOrders', () => {
    it('should return orders filtered by date range', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' }), createMockWOrderInstance({ id: 'order-2' })];
      deps.orderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '20240115', endDate: '20240117', status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
      expect(deps.orderRepository.findBy).toHaveBeenCalledWith({
        date: '20240115',
        endDate: '20240117',
        status: null,
      });
    });

    it('should return 500 on database error', async () => {
      deps.orderRepository.findBy.mockRejectedValue(new Error('Database error'));

      const result = await service.GetOrders({ date: '20240115', endDate: null, status: null });

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // AdjustLockedOrderTime Tests
  // =========================================================================

  /* eslint-disable @typescript-eslint/no-misused-spread, @typescript-eslint/no-unsafe-assignment -- Mock data manipulation */
  describe('AdjustLockedOrderTime', () => {
    // FulfillmentTime uses selectedDate as YYYYMMDD and selectedTime as minutes-from-midnight (0-1440)
    const newTime = {
      selectedDate: '20240120',
      selectedTime: 720, // 12:00 PM noon
    };

    it('should adjust order time without emailing customer', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-reschedule-1',
        locked: 'lock-token-123',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.CONFIRMED,
          selectedDate: '20240115',
          selectedTime: 600, // 10:00 AM
          selectedService: config.id,
        },
        cart: [], // Empty cart for simplicity
        metadata: [
          { key: 'SQORDER', value: 'sq-order-123' },
          { key: 'GCALEVENT', value: 'gcal-event-123' },
        ],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        fulfillment: { ...lockedOrder.fulfillment, ...newTime },
        locked: null,
      });

      const result = await service.AdjustLockedOrderTime(
        lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
        newTime,
        false, // emailCustomer = false
      );

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);

      // Verify Square order was updated
      expect(deps.squareService.RetrieveOrder).toHaveBeenCalledWith('sq-order-123');
      expect(deps.squareService.OrderUpdate).toHaveBeenCalled();

      // Verify calendar was updated
      expect(deps.orderCalendarService.ModifyCalendarEvent).toHaveBeenCalledWith('gcal-event-123', expect.anything());

      // Verify email was NOT sent (emailCustomer = false)
      expect(deps.orderNotificationService.CreateExternalEmailForOrderReschedule).not.toHaveBeenCalled();

      // Verify DB was updated with new time and lock released
      expect(deps.orderRepository.updateWithLock).toHaveBeenCalledWith(
        'order-reschedule-1',
        'lock-token-123',
        expect.objectContaining({
          locked: null,
          fulfillment: expect.objectContaining({
            selectedDate: newTime.selectedDate,
            selectedTime: newTime.selectedTime,
          }),
        }),
      );
    });

    it('should adjust order time and email customer when requested', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-reschedule-2',
        locked: 'lock-token-456',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.CONFIRMED,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
        },
        cart: [],
        metadata: [
          { key: 'SQORDER', value: 'sq-order-456' },
          { key: 'GCALEVENT', value: 'gcal-event-456' },
        ],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        fulfillment: { ...lockedOrder.fulfillment, ...newTime },
        locked: null,
      });

      const result = await service.AdjustLockedOrderTime(
        lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
        newTime,
        true, // emailCustomer = true
      );

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);

      // Verify email WAS sent (emailCustomer = true)
      expect(deps.orderNotificationService.CreateExternalEmailForOrderReschedule).toHaveBeenCalledWith(
        expect.objectContaining({ id: config.id }),
        expect.objectContaining({
          selectedDate: newTime.selectedDate,
          selectedTime: newTime.selectedTime,
        }),
        lockedOrder.customerInfo,
        '',
      );
    });

    it('should not email customer for third-party orders even when emailCustomer is true', async () => {
      // Create a third-party fulfillment config
      const thirdPartyConfig = createMockFulfillmentConfig({
        id: 'doordash',
        service: FulfillmentType.ThirdParty,
        displayName: 'DoorDash',
      });
      setupAdjustTimeMocks(deps, thirdPartyConfig);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-reschedule-3p',
        locked: 'lock-token-3p',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.CONFIRMED,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: 'doordash',
        },
        cart: [],
        metadata: [{ key: 'SQORDER', value: 'sq-order-3p' }],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        fulfillment: { ...lockedOrder.fulfillment, ...newTime },
        locked: null,
      });

      const result = await service.AdjustLockedOrderTime(
        lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
        newTime,
        true, // emailCustomer = true, but should be ignored for 3P
      );

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);

      // Verify email was NOT sent even though emailCustomer = true (because it's 3P)
      expect(deps.orderNotificationService.CreateExternalEmailForOrderReschedule).not.toHaveBeenCalled();
    });

    it('should return 500 when database update fails', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-reschedule-fail',
        locked: 'lock-token-fail',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.CONFIRMED,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
        },
        cart: [],
        metadata: [{ key: 'SQORDER', value: 'sq-order-fail' }],
      });

      deps.orderRepository.updateWithLock.mockRejectedValue(new Error('Database connection lost'));

      const result = await service.AdjustLockedOrderTime(
        lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
        newTime,
        false,
      );

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });

    // =========================================================================
    // Reschedule Ticket Tests
    // =========================================================================

    describe('reschedule ticket sending', () => {
      it('should send reschedule ticket when fulfillment status is SENT', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-sent',
          locked: 'lock-token-ticket-sent',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.SENT, // <-- SENT status triggers ticket
            selectedDate: '20240115',
            selectedTime: 600,
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-ticket' },
            { key: 'GCALEVENT', value: 'gcal-event-ticket' },
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        const result = await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        expect(result.status).toBe(200);
        expect(result.success).toBe(true);

        // Verify SendTimeChangeTicket was called
        expect(deps.printerService.SendTimeChangeTicket).toHaveBeenCalled();
      });

      it('should send reschedule ticket when fulfillment status is PROCESSING', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-processing',
          locked: 'lock-token-ticket-processing',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.PROCESSING, // <-- PROCESSING status triggers ticket
            selectedDate: '20240115',
            selectedTime: 600,
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-processing' },
            { key: 'GCALEVENT', value: 'gcal-event-processing' },
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        const result = await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        expect(result.status).toBe(200);
        expect(result.success).toBe(true);

        // Verify SendTimeChangeTicket was called
        expect(deps.printerService.SendTimeChangeTicket).toHaveBeenCalled();
      });

      it('should NOT send reschedule ticket when fulfillment status is CONFIRMED', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-confirmed',
          locked: 'lock-token-ticket-confirmed',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.CONFIRMED, // <-- CONFIRMED does NOT trigger ticket
            selectedDate: '20240115',
            selectedTime: 600,
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-confirmed' },
            { key: 'GCALEVENT', value: 'gcal-event-confirmed' },
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        const result = await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        expect(result.status).toBe(200);
        expect(result.success).toBe(true);

        // Verify SendTimeChangeTicket was NOT called
        expect(deps.printerService.SendTimeChangeTicket).not.toHaveBeenCalled();
      });

      it('should pass correct arguments to SendTimeChangeTicket', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-args',
          locked: 'lock-token-ticket-args',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.SENT,
            selectedDate: '20240115',
            selectedTime: 600, // 10:00 AM
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-args' },
            { key: 'GCALEVENT', value: 'gcal-event-args' },
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        // Verify SendTimeChangeTicket was called with correct arguments
        expect(deps.printerService.SendTimeChangeTicket).toHaveBeenCalledWith(
          lockedOrder, // The original locked order
          expect.any(Object), // Rebuilt cart (CategorizedRebuiltCart)
          expect.objectContaining({ id: config.id }), // Fulfillment config
          expect.any(Date), // Old promised time (Date object computed from original fulfillment)
        );
      });

      it('should update SQORDER_MSG metadata with ticket Square order IDs', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        // Mock SendTimeChangeTicket to return Square order IDs
        (deps.printerService.SendTimeChangeTicket as jest.Mock).mockResolvedValue({
          success: true,
          squareOrderIds: ['ticket-sq-order-1', 'ticket-sq-order-2'],
        });

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-metadata',
          locked: 'lock-token-ticket-metadata',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.SENT,
            selectedDate: '20240115',
            selectedTime: 600,
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-metadata' },
            { key: 'GCALEVENT', value: 'gcal-event-metadata' },
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        // Verify DB update includes SQORDER_MSG with ticket IDs
        expect(deps.orderRepository.updateWithLock).toHaveBeenCalledWith(
          'order-ticket-metadata',
          'lock-token-ticket-metadata',
          expect.objectContaining({
            metadata: expect.arrayContaining([{ key: 'SQORDER_MSG', value: 'ticket-sq-order-1,ticket-sq-order-2' }]),
          }),
        );
      });

      it('should append ticket IDs to existing SQORDER_MSG metadata', async () => {
        const { config } = setupAdjustTimeMocks(deps);

        // Mock SendTimeChangeTicket to return Square order IDs
        (deps.printerService.SendTimeChangeTicket as jest.Mock).mockResolvedValue({
          success: true,
          squareOrderIds: ['new-ticket-id'],
        });

        const lockedOrder = createMockWOrderInstance({
          id: 'order-ticket-append',
          locked: 'lock-token-ticket-append',
          status: WOrderStatus.CONFIRMED,
          fulfillment: {
            status: WFulfillmentStatus.SENT,
            selectedDate: '20240115',
            selectedTime: 600,
            selectedService: config.id,
          },
          cart: [],
          metadata: [
            { key: 'SQORDER', value: 'sq-order-append' },
            { key: 'GCALEVENT', value: 'gcal-event-append' },
            { key: 'SQORDER_MSG', value: 'existing-msg-id' }, // Existing message ID
          ],
        });

        deps.orderRepository.updateWithLock.mockResolvedValue({
          ...lockedOrder,
          fulfillment: { ...lockedOrder.fulfillment, ...newTime },
          locked: null,
        });

        await service.AdjustLockedOrderTime(
          lockedOrder as typeof lockedOrder & Required<{ locked: string }>,
          newTime,
          false,
        );

        // Verify DB update includes SQORDER_MSG with both existing and new IDs
        expect(deps.orderRepository.updateWithLock).toHaveBeenCalledWith(
          'order-ticket-append',
          'lock-token-ticket-append',
          expect.objectContaining({
            metadata: expect.arrayContaining([{ key: 'SQORDER_MSG', value: 'existing-msg-id,new-ticket-id' }]),
          }),
        );
      });
    });
  });

  // =========================================================================
  // UpdateLockedOrderInfo Seating Tests
  // =========================================================================

  describe('UpdateLockedOrderInfo - Seating Updates', () => {
    it('should NOT send move ticket when assigning tables with status PENDING', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-pending',
        locked: 'lock-token-seating-pending',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: { partySize: 4 }, // No seating yet
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        fulfillment: {
          ...lockedOrder.fulfillment,
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.PENDING, mtime: Date.now() },
          },
        },
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.PENDING, mtime: Date.now() },
          },
        },
      });

      // Verify SendMoveTicket was NOT called (PENDING is a silent status)
      expect(deps.printerService.SendMoveTicket).not.toHaveBeenCalled();

      // Verify Calendar was NOT updated (seating changes don't affect calendar)
      expect(deps.orderCalendarService.ModifyCalendarEvent).not.toHaveBeenCalled();
    });

    it('should NOT send move ticket when assigning tables with status ASSIGNED', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-assigned',
        locked: 'lock-token-seating-assigned',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: { partySize: 4 },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.ASSIGNED, mtime: Date.now() },
          },
        },
      });

      expect(deps.printerService.SendMoveTicket).not.toHaveBeenCalled();
    });

    it('should send move ticket when table changes with status SEATED', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      // Mock SendMoveTicket to return success
      (deps.printerService.SendMoveTicket as jest.Mock).mockResolvedValue({
        success: true,
        squareOrderIds: ['move-ticket-sq-id'],
      });

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-seated',
        locked: 'lock-token-seating-seated',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.SEATED, mtime: Date.now() },
          },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T2'], status: WSeatingStatus.SEATED, mtime: Date.now() },
          },
        },
      });

      // Verify SendMoveTicket WAS called (SEATED is a notify status)
      expect(deps.printerService.SendMoveTicket).toHaveBeenCalledWith(
        lockedOrder,
        expect.any(Object), // rebuiltCart
        expect.stringContaining('T2'), // destination should contain new table
        expect.any(String), // additionalMessage
        expect.objectContaining({ id: config.id }), // fulfillmentConfig
      );
    });

    it('should send move ticket when table changes with status SEATED_WAITING', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      (deps.printerService.SendMoveTicket as jest.Mock).mockResolvedValue({
        success: true,
        squareOrderIds: [],
      });

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-seated-waiting',
        locked: 'lock-token-seating-seated-waiting',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.SEATED_WAITING, mtime: Date.now() },
          },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T3'], status: WSeatingStatus.SEATED_WAITING, mtime: Date.now() },
          },
        },
      });

      expect(deps.printerService.SendMoveTicket).toHaveBeenCalled();
    });

    it('should NOT send move ticket when status is COMPLETED even if tables change', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-completed',
        locked: 'lock-token-seating-completed',
        status: WOrderStatus.COMPLETED,
        fulfillment: {
          status: WFulfillmentStatus.COMPLETED,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.COMPLETED, mtime: Date.now() },
          },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T5'], status: WSeatingStatus.COMPLETED, mtime: Date.now() },
          },
        },
      });

      // COMPLETED is a silent status, no move ticket
      expect(deps.printerService.SendMoveTicket).not.toHaveBeenCalled();
    });

    it('should NOT send move ticket when tables have not changed', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      const sameSeating = { tableId: ['T1'], status: WSeatingStatus.SEATED, mtime: Date.now() };

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-same',
        locked: 'lock-token-seating-same',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: { partySize: 4, seating: sameSeating },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: { partySize: 4, seating: sameSeating },
        },
      });

      // Same tables, no move ticket even though status is SEATED
      expect(deps.printerService.SendMoveTicket).not.toHaveBeenCalled();
    });

    it('should update SQORDER_MSG metadata with move ticket Square order IDs', async () => {
      const { config } = setupAdjustTimeMocks(deps);

      (deps.printerService.SendMoveTicket as jest.Mock).mockResolvedValue({
        success: true,
        squareOrderIds: ['move-sq-id-1', 'move-sq-id-2'],
      });

      const lockedOrder = createMockWOrderInstance({
        id: 'order-seating-metadata',
        locked: 'lock-token-seating-metadata',
        status: WOrderStatus.CONFIRMED,
        fulfillment: {
          status: WFulfillmentStatus.SENT,
          selectedDate: '20240115',
          selectedTime: 600,
          selectedService: config.id,
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T1'], status: WSeatingStatus.SEATED, mtime: Date.now() },
          },
        },
        cart: [],
        metadata: [],
      });

      deps.orderRepository.updateWithLock.mockResolvedValue({
        ...lockedOrder,
        locked: null,
      });

      await service.UpdateLockedOrderInfo(lockedOrder as typeof lockedOrder & Required<{ locked: string }>, {
        fulfillment: {
          ...(lockedOrder.fulfillment as FulfillmentData),
          dineInInfo: {
            partySize: 4,
            seating: { tableId: ['T2'], status: WSeatingStatus.SEATED, mtime: Date.now() },
          },
        },
      });

      // Verify DB update includes SQORDER_MSG with move ticket IDs
      expect(deps.orderRepository.updateWithLock).toHaveBeenCalledWith(
        'order-seating-metadata',
        'lock-token-seating-metadata',
        expect.objectContaining({
          metadata: expect.arrayContaining([{ key: 'SQORDER_MSG', value: 'move-sq-id-1,move-sq-id-2' }]),
        }),
      );
    });
  });
  /* eslint-enable @typescript-eslint/no-misused-spread, @typescript-eslint/no-unsafe-assignment */
});
