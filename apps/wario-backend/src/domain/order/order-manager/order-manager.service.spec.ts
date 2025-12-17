/**
 * OrderManagerService Unit Tests
 *
 * Tests for the core order management logic including:
 * - GetOrder / GetOrders (querying)
 */

import { createMock, createMockWOrderInstance, resetOrderIdCounter } from 'test/utils';

import { Test, type TestingModule } from '@nestjs/testing';
import { type PinoLogger } from 'nestjs-pino';

import { WOrderStatus } from '@wcp/wario-shared';

import { CatalogProviderService } from 'src/modules/catalog-provider/catalog-provider.service';
import { GoogleService } from 'src/modules/integrations/google/google.service';
import { SquareService } from 'src/modules/integrations/square/square.service';

import { AppConfigService } from '../../../config/app-config.service';
import { DataProviderService } from '../../../config/data-provider/data-provider.service';
import { StoreCreditProviderService } from '../../../config/store-credit-provider/store-credit-provider.service';
import { PrinterService } from '../../../infrastructure/printing/printer/printer.service';
import { ORDER_REPOSITORY } from '../../../repositories/interfaces';
import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';

import { OrderManagerService } from './order-manager.service';

// Creating mock logger for use throughout tests
const createMockLogger = () => createMock<PinoLogger>();

// Create mock repository
const createMockOrderRepository = () => ({
  findById: jest.fn(),
  findBy: jest.fn(), // Consolidated query method accepting { date, endDate, status }
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

describe('OrderManagerService', () => {
  let service: OrderManagerService;
  let mockOrderRepository: ReturnType<typeof createMockOrderRepository>;

  beforeEach(async () => {
    resetOrderIdCounter();
    mockOrderRepository = createMockOrderRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderManagerService,
        { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
        // PinoLogger with @InjectPinoLogger decorator uses this token format
        { provide: 'PinoLogger:OrderManagerService', useValue: createMockLogger() },
        // Mock all service dependencies
        { provide: GoogleService, useValue: createMock<GoogleService>() },
        { provide: SquareService, useValue: createMock<SquareService>() },
        { provide: StoreCreditProviderService, useValue: createMock<StoreCreditProviderService>() },
        { provide: CatalogProviderService, useValue: createMock<CatalogProviderService>() },
        { provide: DataProviderService, useValue: createMock<DataProviderService>() },
        { provide: AppConfigService, useValue: createMock<AppConfigService>() },
        { provide: OrderNotificationService, useValue: createMock<OrderNotificationService>() },
        { provide: OrderPaymentService, useValue: createMock<OrderPaymentService>() },
        { provide: OrderValidationService, useValue: createMock<OrderValidationService>() },
        { provide: OrderCalendarService, useValue: createMock<OrderCalendarService>() },
        { provide: PrinterService, useValue: createMock<PrinterService>() },
      ],
    }).compile();

    service = module.get<OrderManagerService>(OrderManagerService);
  });

  // =========================================================================
  // GetOrder Tests
  // =========================================================================

  describe('GetOrder', () => {
    it('should return order when found', async () => {
      const mockOrder = createMockWOrderInstance({ id: 'order-123' });
      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.GetOrder('order-123');

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.id).toBe('order-123');
      }
    });

    it('should return 404 when order not found', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const result = await service.GetOrder('nonexistent-order');

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].code).toBe('NOT_FOUND');
      }
    });

    it('should return 500 on database error', async () => {
      mockOrderRepository.findById.mockRejectedValue(new Error('Database error'));

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
      const fulfillment = createMockWOrderInstance().fulfillment;
      fulfillment.selectedDate = '2024-01-15';
      const order1 = createMockWOrderInstance({ id: 'order-1', fulfillment });

      const fulfillment2 = createMockWOrderInstance().fulfillment;
      fulfillment2.selectedDate = '2024-01-16';
      const order2 = createMockWOrderInstance({ id: 'order-2', fulfillment: fulfillment2 });

      const mockOrders = [order1, order2];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '2024-01-15', endDate: '2024-01-17', status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: '2024-01-15',
        endDate: '2024-01-17',
        status: null,
      });
    });

    it('should filter by date range and status', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1', status: WOrderStatus.CONFIRMED })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({
        date: '2024-01-15',
        endDate: '2024-01-17',
        status: WOrderStatus.CONFIRMED,
      });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(1);
        expect(result.result[0].status).toBe(WOrderStatus.CONFIRMED);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: '2024-01-15',
        endDate: '2024-01-17',
        status: WOrderStatus.CONFIRMED,
      });
    });

    it('should return orders filtered by date only', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' }), createMockWOrderInstance({ id: 'order-2' })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '2024-01-15', endDate: null, status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: '2024-01-15',
        endDate: null,
        status: null,
      });
    });

    it('should return orders filtered by status only', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1', status: WOrderStatus.OPEN })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: null, endDate: null, status: WOrderStatus.OPEN });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(1);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: null,
        endDate: null,
        status: WOrderStatus.OPEN,
      });
    });

    it('should return all orders when no filters provided', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' }), createMockWOrderInstance({ id: 'order-2' })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: null, endDate: null, status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: null,
        endDate: null,
        status: null,
      });
    });

    it('should filter by both date and status when both provided', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1', status: WOrderStatus.CONFIRMED })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '2024-01-15', endDate: null, status: WOrderStatus.CONFIRMED });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(1);
        expect(result.result[0].status).toBe(WOrderStatus.CONFIRMED);
      }
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: '2024-01-15',
        endDate: null,
        status: WOrderStatus.CONFIRMED,
      });
    });

    it('should handle ISO date strings with time components by truncating to YYYY-MM-DD', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' })];
      mockOrderRepository.findBy.mockResolvedValue(mockOrders);

      // Pass ISO strings with time
      const result = await service.GetOrders({
        date: '2024-01-15T10:00:00.000Z',
        endDate: '2024-01-17T15:30:00.000Z',
        status: null,
      });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      // Verify repository was called with simple date strings (truncated)
      expect(mockOrderRepository.findBy).toHaveBeenCalledWith({
        date: '2024-01-15',
        endDate: '2024-01-17',
        status: null,
      });
    });

    it('should return 500 on database error', async () => {
      mockOrderRepository.findBy.mockRejectedValue(new Error('Database error'));

      const result = await service.GetOrders({ date: '2024-01-15', endDate: null, status: null });

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });
});
