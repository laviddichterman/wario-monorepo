/* eslint-disable @typescript-eslint/no-unsafe-call */
/**
 * OrderManagerService Unit Tests
 *
 * Tests for the core order management logic including:
 * - GetOrder / GetOrders (querying)
 * - ObliterateLocks (admin utility)
 */

import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { type PinoLogger } from 'nestjs-pino';

import {
  createMock,
  createMockModel,
  createMockWOrderInstance,
  resetOrderIdCounter,
} from '../../../test/utils';
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

describe('OrderManagerService', () => {
  let service: OrderManagerService;
  let mockOrderModel: ReturnType<typeof createMockModel>;

  beforeEach(async () => {
    resetOrderIdCounter();
    mockOrderModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderManagerService,
        { provide: getModelToken('WOrderInstance'), useValue: mockOrderModel },
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
      mockOrderModel.findById.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve({ toObject: () => mockOrder }))
        ),
      });

      const result = await service.GetOrder('order-123');

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.id).toBe('order-123');
      }
    });

    it('should return 404 when order not found', async () => {
      mockOrderModel.findById.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve(null))
        ),
      });

      const result = await service.GetOrder('nonexistent-order');

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].code).toBe('NOT_FOUND');
      }
    });

    it('should return 500 on database error', async () => {
      mockOrderModel.findById.mockReturnValue({
        then: jest.fn().mockReturnValue(Promise.reject(new Error('Database error'))),
        catch: jest.fn().mockImplementation((onReject) =>
          Promise.resolve(onReject(new Error('Database error')))
        ),
      });

      const result = await service.GetOrder('order-123');

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // GetOrders Tests
  // =========================================================================

  describe('GetOrders', () => {
    it('should return all matching orders', async () => {
      const mockOrders = [
        createMockWOrderInstance({ id: 'order-1' }),
        createMockWOrderInstance({ id: 'order-2' }),
      ];
      mockOrderModel.find.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve(mockOrders.map((o) => ({ toObject: () => o }))))
        ),
      });

      const result = await service.GetOrders({});

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(2);
      }
    });

    it('should return empty array when no orders match', async () => {
      mockOrderModel.find.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve([]))
        ),
      });

      const result = await service.GetOrders({ status: 'NONEXISTENT' });

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toHaveLength(0);
      }
    });

    it('should handle query filters', async () => {
      mockOrderModel.find.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve([]))
        ),
      });

      await service.GetOrders({ status: 'OPEN', 'fulfillment.selectedDate': '2024-01-15' });

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        status: 'OPEN',
        'fulfillment.selectedDate': '2024-01-15',
      });
    });

    it('should return 500 on database error', async () => {
      mockOrderModel.find.mockReturnValue({
        then: jest.fn().mockReturnValue(Promise.reject(new Error('Database error'))),
        catch: jest.fn().mockImplementation((onReject) =>
          Promise.resolve(onReject(new Error('Database error')))
        ),
      });

      const result = await service.GetOrders({});

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // ObliterateLocks Tests
  // =========================================================================

  describe('ObliterateLocks', () => {
    it('should unlock all locked orders', async () => {
      mockOrderModel.updateMany.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve({ modifiedCount: 5 }))
        ),
      });

      const result = await service.ObliterateLocks();

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toBe('Unlocked 5 orders.');
      }
      expect(mockOrderModel.updateMany).toHaveBeenCalledWith(
        { locked: { $ne: null } },
        { locked: null },
      );
    });

    it('should return success even when no orders are locked', async () => {
      mockOrderModel.updateMany.mockReturnValue({
        then: jest.fn().mockImplementation((onResolve) =>
          Promise.resolve(onResolve({ modifiedCount: 0 }))
        ),
      });

      const result = await service.ObliterateLocks();

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result).toBe('Unlocked 0 orders.');
      }
    });

    it('should return 500 on database error', async () => {
      mockOrderModel.updateMany.mockReturnValue({
        then: jest.fn().mockReturnValue(Promise.reject(new Error('Database error'))),
        catch: jest.fn().mockImplementation((onReject) =>
          Promise.resolve(onReject(new Error('Database error')))
        ),
      });

      const result = await service.ObliterateLocks();

      expect(result.status).toBe(500);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });
});
