/* eslint-disable @typescript-eslint/unbound-method */
/**
 * OrderPaymentService Unit Tests
 *
 * Tests for payment processing and refund operations:
 * - IssueRefundCreditForOrder: Issues store credit for cancelled orders
 * - RefundStoreCreditDebits: Refunds store credits after failed processing
 * - RefundSquarePayments: Refunds completed Square payments
 * - CancelSquarePayments: Cancels authorized (not captured) payments
 */

import { Test, type TestingModule } from '@nestjs/testing';

import { CURRENCY, TenderBaseStatus, type ValidateLockAndSpendSuccess } from '@wcp/wario-shared';

import {
  createMockCreditPayment,
  createMockCustomerInfo,
  mockDataProviderService,
  mockSquareService,
  mockStoreCreditProviderService,
} from '../../../test/utils';
import { DataProviderService } from '../data-provider/data-provider.service';
import { SquareService } from '../square/square.service';
import { StoreCreditProviderService } from '../store-credit-provider/store-credit-provider.service';

import { OrderPaymentService } from './order-payment.service';

describe('OrderPaymentService', () => {
  let service: OrderPaymentService;
  let mockSquareSvc: ReturnType<typeof mockSquareService>;
  let mockStoreCreditSvc: ReturnType<typeof mockStoreCreditProviderService>;
  let mockDataProvider: ReturnType<typeof mockDataProviderService>;

  // Mock logger provider
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    mockSquareSvc = mockSquareService();
    mockStoreCreditSvc = mockStoreCreditProviderService();
    mockDataProvider = mockDataProviderService();

    // Setup KeyValueConfig property and method
    Object.defineProperty(mockDataProvider, 'KeyValueConfig', {
      get: () => ({ SQUARE_LOCATION: 'test-location-id' }),
      configurable: true,
    });
    // The service calls getKeyValueConfig() method, not the property directly
    (mockDataProvider.getKeyValueConfig as jest.Mock).mockReturnValue({
      SQUARE_LOCATION: 'test-location-id',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPaymentService,
        { provide: SquareService, useValue: mockSquareSvc },
        { provide: StoreCreditProviderService, useValue: mockStoreCreditSvc },
        { provide: DataProviderService, useValue: mockDataProvider },
        { provide: 'PinoLogger:OrderPaymentService', useValue: mockLogger },
      ],
    }).compile();

    service = module.get<OrderPaymentService>(OrderPaymentService);
  });

  describe('constructor', () => {
    it('should create the service', () => {
      expect(service).toBeDefined();
    });
  });

  // =========================================================================
  // RefundStoreCreditDebits Tests
  // =========================================================================

  describe('RefundStoreCreditDebits', () => {
    it('should refund multiple store credit debits', async () => {
      const spends: ValidateLockAndSpendSuccess[] = [
        { success: true, index: 0, entry: ['code1', '', '', 50] },
        { success: true, index: 1, entry: ['code2', '', '', 100] },
      ];

      (mockStoreCreditSvc.CheckAndRefundStoreCredit as jest.Mock).mockResolvedValue({ success: true });

      await service.RefundStoreCreditDebits(spends);

      expect(mockStoreCreditSvc.CheckAndRefundStoreCredit).toHaveBeenCalledTimes(2);
      expect(mockStoreCreditSvc.CheckAndRefundStoreCredit).toHaveBeenCalledWith(spends[0].entry, 0);
      expect(mockStoreCreditSvc.CheckAndRefundStoreCredit).toHaveBeenCalledWith(spends[1].entry, 1);
    });

    it('should handle empty spend list', async () => {
      const result = await service.RefundStoreCreditDebits([]);

      expect(result).toEqual([]);
      expect(mockStoreCreditSvc.CheckAndRefundStoreCredit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // RefundSquarePayments Tests
  // =========================================================================

  describe('RefundSquarePayments', () => {
    it('should refund completed payments only', async () => {
      const payments = [
        createMockCreditPayment({
          status: TenderBaseStatus.COMPLETED,
          processorId: 'payment-1',
          amount: { amount: 1000, currency: CURRENCY.USD },
        }),
        createMockCreditPayment({
          status: TenderBaseStatus.AUTHORIZED, // Not completed
          processorId: 'payment-2',
          amount: { amount: 500, currency: CURRENCY.USD },
        }),
      ];

      (mockSquareSvc.RefundPayment as jest.Mock).mockResolvedValue({ success: true });

      await service.RefundSquarePayments(payments, 'Order cancelled');

      expect(mockSquareSvc.RefundPayment).toHaveBeenCalledTimes(1);
      expect(mockSquareSvc.RefundPayment).toHaveBeenCalledWith(
        'payment-1',
        { amount: 1000, currency: CURRENCY.USD },
        'Order cancelled',
      );
    });

    it('should handle no completed payments', async () => {
      const payments = [
        createMockCreditPayment({
          status: TenderBaseStatus.AUTHORIZED,
          processorId: 'payment-1',
        }),
      ];

      const result = await service.RefundSquarePayments(payments, 'Cancelled');

      expect(result).toEqual([]);
      expect(mockSquareSvc.RefundPayment).not.toHaveBeenCalled();
    });

    it('should handle empty payment list', async () => {
      const result = await service.RefundSquarePayments([], 'No payments');

      expect(result).toEqual([]);
    });

    it('should return failure result when Square API fails', async () => {
      const payments = [
        createMockCreditPayment({
          status: TenderBaseStatus.COMPLETED,
          processorId: 'payment-1',
          amount: { amount: 1000, currency: CURRENCY.USD },
        }),
      ];

      (mockSquareSvc.RefundPayment as jest.Mock).mockResolvedValue({
        success: false,
        result: null,
        error: [{ category: 'API_ERROR', code: 'INTERNAL_ERROR', detail: 'Square down' }],
      });

      const result = await service.RefundSquarePayments(payments, 'Order cancelled');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ success: false }));
    });
  });

  // =========================================================================
  // CancelSquarePayments Tests
  // =========================================================================

  describe('CancelSquarePayments', () => {
    it('should cancel authorized payments only', async () => {
      const payments = [
        {
          ...createMockCreditPayment({ status: TenderBaseStatus.AUTHORIZED, processorId: 'auth-1' }),
        },
        {
          ...createMockCreditPayment({ status: TenderBaseStatus.COMPLETED, processorId: 'completed-1' }),
        },
      ];

      (mockSquareSvc.CancelPayment as jest.Mock).mockResolvedValue({ success: true });

      await service.CancelSquarePayments(payments);

      expect(mockSquareSvc.CancelPayment).toHaveBeenCalledTimes(1);
      expect(mockSquareSvc.CancelPayment).toHaveBeenCalledWith('auth-1');
    });

    it('should handle no authorized payments', async () => {
      const payments = [createMockCreditPayment({ status: TenderBaseStatus.COMPLETED, processorId: 'completed-1' })];

      const result = await service.CancelSquarePayments(payments);

      expect(result).toEqual([]);
      expect(mockSquareSvc.CancelPayment).not.toHaveBeenCalled();
    });

    it('should return failure result when Square API fails', async () => {
      const payments = [createMockCreditPayment({ status: TenderBaseStatus.AUTHORIZED, processorId: 'auth-1' })];

      (mockSquareSvc.CancelPayment as jest.Mock).mockResolvedValue({
        success: false,
        result: null,
        error: [{ category: 'API_ERROR', code: 'INTERNAL_ERROR', detail: 'Square down' }],
      });

      const result = await service.CancelSquarePayments(payments);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ success: false }));
    });
  });

  // =========================================================================
  // IssueRefundCreditForOrder Tests
  // =========================================================================

  describe('IssueRefundCreditForOrder', () => {
    const mockSquareOrder = {
      id: 'order-123',
      referenceId: 'ref-abc',
      locationId: 'loc-xyz',
    };

    const mockCustomerInfo = createMockCustomerInfo({
      email: 'test@example.com',
      givenName: 'John',
      familyName: 'Doe',
    });

    const refundAmount = { amount: 1500, currency: CURRENCY.USD };

    it('should create store credit when all steps succeed', async () => {
      (mockSquareSvc.CreateOrder as jest.Mock).mockResolvedValue({
        success: true,
        result: { order: { id: 'new-order-id', locationId: 'loc-xyz' } },
      });
      (mockSquareSvc.CreatePayment as jest.Mock).mockResolvedValue({ success: true });
      (mockStoreCreditSvc.IssueCredit as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await service.IssueRefundCreditForOrder(mockSquareOrder, mockCustomerInfo, refundAmount);

      expect(result.success).toBe(true);
      expect(mockSquareSvc.CreateOrder).toHaveBeenCalled();
      expect(mockSquareSvc.CreatePayment).toHaveBeenCalled();
      expect(mockStoreCreditSvc.IssueCredit).toHaveBeenCalled();
    });

    it('should return failure when Square CreateOrder fails', async () => {
      (mockSquareSvc.CreateOrder as jest.Mock).mockResolvedValue({
        success: false,
        error: [{ category: 'API_ERROR', code: 'INTERNAL_ERROR', detail: 'Square error' }],
      });

      const result = await service.IssueRefundCreditForOrder(mockSquareOrder, mockCustomerInfo, refundAmount);

      expect(result.success).toBe(false);
      expect(mockSquareSvc.CreatePayment).not.toHaveBeenCalled();
      expect(mockStoreCreditSvc.IssueCredit).not.toHaveBeenCalled();
    });

    it('should return failure when CreatePayment fails', async () => {
      (mockSquareSvc.CreateOrder as jest.Mock).mockResolvedValue({
        success: true,
        result: { order: { id: 'new-order-id', locationId: 'loc-xyz' } },
      });
      (mockSquareSvc.CreatePayment as jest.Mock).mockResolvedValue({
        success: false,
        error: [{ category: 'API_ERROR', code: 'PAYMENT_FAILED', detail: 'Payment failed' }],
      });

      const result = await service.IssueRefundCreditForOrder(mockSquareOrder, mockCustomerInfo, refundAmount);

      expect(result.success).toBe(false);
      expect(mockStoreCreditSvc.IssueCredit).not.toHaveBeenCalled();
    });
  });
});
