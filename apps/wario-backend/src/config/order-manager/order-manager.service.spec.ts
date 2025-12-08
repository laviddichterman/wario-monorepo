/**
 * OrderManagerService Unit Tests
 *
 * Tests for the core order management logic including:
 * - GetOrder / GetOrders (querying)
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { type PinoLogger } from 'nestjs-pino';

import { WOrderStatus } from '@wcp/wario-shared';

import { createMock, createMockWOrderInstance, resetOrderIdCounter } from '../../../test/utils';
import { ORDER_REPOSITORY } from '../../repositories/interfaces';
import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';
import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';
import { OrderCalendarService } from '../order-calendar/order-calendar.service';
import { OrderNotificationService } from '../order-notification/order-notification.service';
import { OrderPaymentService } from '../order-payment/order-payment.service';
import { OrderValidationService } from '../order-validation/order-validation.service';
import { PrinterService } from '../printer/printer.service';
import { SquareService } from '../square/square.service';
import { StoreCreditProviderService } from '../store-credit-provider/store-credit-provider.service';

import { OrderManagerService } from './order-manager.service';

// Creating mock logger for use throughout tests
const createMockLogger = () => createMock<PinoLogger>();

// Create mock repository
const createMockOrderRepository = () => ({
  findById: jest.fn(),
  findByStatus: jest.fn(),
  findByFulfillmentDate: jest.fn(),
  create: jest.fn(),
  updateWithLock: jest.fn(),
  releaseLock: jest.fn(),
  lockReadyOrders: jest.fn(),
  findByLock: jest.fn(),
  unlockAll: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByThirdPartySquareIds: jest.fn(),
  bulkCreate: jest.fn(),
  acquireLock: jest.fn(),
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
    it('should return orders filtered by date', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' }), createMockWOrderInstance({ id: 'order-2' })];
      mockOrderRepository.findByFulfillmentDate.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '2024-01-15', status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
      expect(mockOrderRepository.findByFulfillmentDate).toHaveBeenCalledWith('2024-01-15');
    });

    it('should return orders filtered by status', async () => {
      const mockOrders = [createMockWOrderInstance({ id: 'order-1' })];
      mockOrderRepository.findByStatus.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: null, status: WOrderStatus.OPEN });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(1);
      }
      expect(mockOrderRepository.findByStatus).toHaveBeenCalledWith(WOrderStatus.OPEN);
    });

    it('should return empty array when no filters provided', async () => {
      const result = await service.GetOrders({ date: null, status: null });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(0);
      }
    });

    it('should filter by both date and status when both provided', async () => {
      const mockOrders = [
        createMockWOrderInstance({ id: 'order-1', status: WOrderStatus.CONFIRMED }),
        createMockWOrderInstance({ id: 'order-2', status: WOrderStatus.OPEN }),
      ];
      mockOrderRepository.findByFulfillmentDate.mockResolvedValue(mockOrders);

      const result = await service.GetOrders({ date: '2024-01-15', status: WOrderStatus.CONFIRMED });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should filter to only CONFIRMED orders
        expect(result.result).toHaveLength(1);
        expect(result.result[0].status).toBe(WOrderStatus.CONFIRMED);
      }
    });

    it('should return 500 on database error', async () => {
      mockOrderRepository.findByFulfillmentDate.mockRejectedValue(new Error('Database error'));

      const result = await service.GetOrders({ date: '2024-01-15', status: null });

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });
});
