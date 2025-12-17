/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * OrderController Unit Tests
 *
 * Tests the order API controller logic in isolation.
 * Note: The OrderLockInterceptor is overridden to bypass the locking mechanism.
 * Use integration tests for full lock behavior testing.
 */

import {
  createMock,
  createMockModel,
  createMockWOrderInstance,
  mockOrderManagerService,
  resetOrderIdCounter,
} from 'test/utils';

import { BadRequestException, HttpException } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { WOrderStatus } from '@wcp/wario-shared';

import { OrderManagerService } from 'src/domain/order/order-manager/order-manager.service';

import { OrderNotFoundException } from '../../exceptions';
import { OrderLockInterceptor } from '../../interceptors/order-lock.interceptor';

import { OrderController } from './order.controller';

// Create a no-op interceptor to bypass OrderLockInterceptor in unit tests
const createMockInterceptor = () => ({
  intercept: jest.fn().mockImplementation((_context, next) => next.handle()),
});

describe('OrderController', () => {
  let controller: OrderController;
  let mockOrderManager: jest.Mocked<OrderManagerService>;

  beforeEach(async () => {
    resetOrderIdCounter();
    mockOrderManager = mockOrderManagerService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderManagerService, useValue: mockOrderManager },
        { provide: Reflector, useValue: createMock<Reflector>() },
        { provide: getModelToken('WOrderInstance'), useValue: createMockModel() },
        // Override all APP_INTERCEPTOR to prevent OrderLockInterceptor from being called
        { provide: APP_INTERCEPTOR, useValue: createMockInterceptor() },
      ],
    })
      .overrideInterceptor(OrderLockInterceptor)
      .useValue(createMockInterceptor())
      .compile();

    controller = module.get<OrderController>(OrderController);
  });

  // =========================================================================
  // GET /api/v1/order/:oId Tests
  // =========================================================================

  describe('getOrder', () => {
    it('should return order when found', async () => {
      const mockOrder = createMockWOrderInstance({ id: 'order-123' });
      mockOrderManager.GetOrder.mockResolvedValue({
        status: 200,
        success: true,
        result: mockOrder,
      });

      const result = await controller.getOrder('order-123');

      expect(result.success).toBe(true);
      expect(mockOrderManager.GetOrder).toHaveBeenCalledWith('order-123');
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      mockOrderManager.GetOrder.mockResolvedValue({
        status: 404,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND', detail: '' }],
      });

      await expect(controller.getOrder('nonexistent')).rejects.toThrow(OrderNotFoundException);
    });
  });

  // =========================================================================
  // GET /api/v1/order Tests
  // =========================================================================

  describe('getOrders', () => {
    it('should return all orders when no filters', async () => {
      const mockOrders = [createMockWOrderInstance(), createMockWOrderInstance()];
      mockOrderManager.GetOrders.mockResolvedValue({
        status: 200,
        success: true,
        result: mockOrders,
      });

      const result = await controller.getOrders('', '', '');

      // Controller now returns the result array directly, not the wrapped response
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      mockOrderManager.GetOrders.mockResolvedValue({
        status: 200,
        success: true,
        result: [],
      });

      await controller.getOrders('', '', 'OPEN');

      expect(mockOrderManager.GetOrders).toHaveBeenCalledWith(expect.objectContaining({ status: WOrderStatus.OPEN }));
    });

    it('should throw HttpException on service failure', async () => {
      mockOrderManager.GetOrders.mockResolvedValue({
        status: 500,
        success: false,
        error: [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', detail: 'error' }],
      });

      await expect(controller.getOrders('', '', '')).rejects.toThrow(HttpException);
    });
  });

  // =========================================================================
  // POST /api/v1/order Tests
  // =========================================================================

  describe('postOrder', () => {
    it('should return 201 on successful order creation', async () => {
      const mockOrder = createMockWOrderInstance();
      mockOrderManager.CreateOrder.mockResolvedValue({
        status: 201,
        success: true,
        result: mockOrder,
      });

      const mockBody = {} as Parameters<typeof controller.postOrder>[0];
      const result = await controller.postOrder(mockBody, '127.0.0.1');

      expect(result.status).toBe(201);
      expect(result.success).toBe(true);
    });

    it('should throw HttpException on order creation failure', async () => {
      mockOrderManager.CreateOrder.mockResolvedValue({
        status: 400,
        success: false,
        error: [{ category: 'INVALID_REQUEST_ERROR', code: 'INVALID_CART', detail: '' }],
      });

      const mockBody = {} as Parameters<typeof controller.postOrder>[0];

      await expect(controller.postOrder(mockBody, '127.0.0.1')).rejects.toThrow(HttpException);
    });

    it('should pass IP address to CreateOrder', async () => {
      const mockOrder = createMockWOrderInstance();
      mockOrderManager.CreateOrder.mockResolvedValue({
        status: 201,
        success: true,
        result: mockOrder,
      });

      const mockBody = {} as Parameters<typeof controller.postOrder>[0];
      await controller.postOrder(mockBody, '192.168.1.100');

      expect(mockOrderManager.CreateOrder).toHaveBeenCalledWith(mockBody, '192.168.1.100');
    });
  });

  // =========================================================================
  // PUT /api/v1/order/:oId/cancel Tests
  // =========================================================================

  describe('putCancelOrder', () => {
    it('should cancel order when lock acquired', async () => {
      const lockedOrder = createMockWOrderInstance({ id: 'order-123' });
      mockOrderManager.CancelLockedOrder.mockResolvedValue({
        status: 200,
        success: true,
        result: { ...lockedOrder, status: WOrderStatus.CANCELED },
      });

      const result = await controller.putCancelOrder(lockedOrder, {
        reason: 'Customer request',
        emailCustomer: true,
        refundToOriginalPayment: true,
      });

      expect(result.status).toBe(200);
      expect(mockOrderManager.CancelLockedOrder).toHaveBeenCalledWith(lockedOrder, 'Customer request', true, true);
    });

    it('should throw BadRequestException when lock not acquired', async () => {
      await expect(controller.putCancelOrder(undefined, { reason: 'test' })).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException on cancellation failure', async () => {
      const lockedOrder = createMockWOrderInstance();
      mockOrderManager.CancelLockedOrder.mockResolvedValue({
        status: 500,
        success: false,
        error: [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', detail: '' }],
      });

      await expect(controller.putCancelOrder(lockedOrder, { reason: 'test' })).rejects.toThrow(HttpException);
    });
  });

  // =========================================================================
  // PUT /api/v1/order/:oId/confirm Tests
  // =========================================================================

  describe('putConfirmOrder', () => {
    it('should confirm order when lock acquired', async () => {
      const lockedOrder = createMockWOrderInstance({ id: 'order-123' });
      mockOrderManager.ConfirmLockedOrder.mockResolvedValue({
        status: 200,
        success: true,
        result: { ...lockedOrder, status: WOrderStatus.CONFIRMED },
      });

      const result = await controller.putConfirmOrder(lockedOrder);

      expect(result.status).toBe(200);
      expect(mockOrderManager.ConfirmLockedOrder).toHaveBeenCalledWith(lockedOrder);
    });

    it('should throw BadRequestException when lock not acquired', async () => {
      await expect(controller.putConfirmOrder(undefined)).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // PUT /api/v1/order/unlock Tests
  // =========================================================================

  describe('putUnlock', () => {
    it('should call ObliterateLocks and return success', async () => {
      mockOrderManager.ObliterateLocks.mockResolvedValue({
        status: 200,
        success: true,
        result: 'Unlocked 3 orders.',
      });

      const result = await controller.putUnlock();

      expect(result).toEqual({ ok: 'yay!' });
      expect(mockOrderManager.ObliterateLocks).toHaveBeenCalled();
    });
  });
});
