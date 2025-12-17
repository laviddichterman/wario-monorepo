/**
 * StoreCreditController Unit Tests
 *
 * Tests for the store credit API endpoints:
 * - GET /api/v1/payments/storecredit/validate
 * - POST /api/v1/payments/storecredit/spend
 * - POST /api/v1/payments/storecredit/purchase
 * - POST /api/v1/payments/storecredit/issue
 */

import { mockStoreCreditProviderService } from 'test/utils';

import { HttpException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { CURRENCY, StoreCreditType } from '@wcp/wario-shared';

import { StoreCreditProviderService } from 'src/config/store-credit-provider/store-credit-provider.service';

import { InsufficientCreditException, StoreCreditNotFoundException } from '../../exceptions';

import { StoreCreditController } from './store-credit.controller';

describe('StoreCreditController', () => {
  let controller: StoreCreditController;
  let mockStoreCreditService: jest.Mocked<StoreCreditProviderService>;

  beforeEach(async () => {
    mockStoreCreditService = mockStoreCreditProviderService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreCreditController],
      providers: [{ provide: StoreCreditProviderService, useValue: mockStoreCreditService }],
    }).compile();

    controller = module.get<StoreCreditController>(StoreCreditController);
  });

  // =========================================================================
  // GET /api/v1/payments/storecredit/validate Tests
  // =========================================================================

  describe('getValidateCredit', () => {
    it('should return valid credit info when code is valid', async () => {
      const mockResponse = {
        valid: true,
        credit_type: StoreCreditType.MONEY,
        amount: { amount: 5000, currency: CURRENCY.USD },
        lock: { iv: 'test', enc: 'test', auth: 'test' },
      };
      (mockStoreCreditService.ValidateAndLockCode as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.getValidateCredit('ABC123');

      expect(result).toEqual(mockResponse);
      expect(mockStoreCreditService.ValidateAndLockCode).toHaveBeenCalledWith('ABC123');
    });

    it('should throw StoreCreditNotFoundException when code invalid', async () => {
      (mockStoreCreditService.ValidateAndLockCode as jest.Mock).mockResolvedValue({
        valid: false,
      });

      await expect(controller.getValidateCredit('INVALID')).rejects.toThrow(StoreCreditNotFoundException);
    });

    it('should throw StoreCreditNotFoundException when balance is zero', async () => {
      (mockStoreCreditService.ValidateAndLockCode as jest.Mock).mockResolvedValue({
        valid: true,
        credit_type: StoreCreditType.MONEY,
        amount: { amount: 0, currency: CURRENCY.USD },
        lock: { iv: 'test', enc: 'test', auth: 'test' },
      });

      await expect(controller.getValidateCredit('EMPTY')).rejects.toThrow(StoreCreditNotFoundException);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/storecredit/spend Tests
  // =========================================================================

  describe('postSpendCredit', () => {
    it('should return success and remaining balance when spend succeeds', async () => {
      (mockStoreCreditService.ValidateLockAndSpend as jest.Mock).mockResolvedValue({
        success: true,
        index: 0,
        entry: ['', '', '', 50], // 50 dollars = 5000 cents total
      });

      const body = {
        code: 'ABC123',
        updatedBy: 'test-user',
        amount: { amount: 1000, currency: CURRENCY.USD },
        lock: { iv: 'test', enc: 'test', auth: 'test' },
      };
      const result = await controller.postSpendCredit(body);

      expect(result.success).toBe(true);
      expect(result.balance.amount).toBe(4000); // 5000 - 1000
    });

    it('should throw InsufficientCreditException when spend fails', async () => {
      (mockStoreCreditService.ValidateLockAndSpend as jest.Mock).mockResolvedValue({
        success: false,
      });

      const body = {
        code: 'ABC123',
        updatedBy: 'test-user',
        amount: { amount: 10000, currency: CURRENCY.USD },
        lock: { iv: 'test', enc: 'test', auth: 'test' },
      };

      await expect(controller.postSpendCredit(body)).rejects.toThrow(InsufficientCreditException);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/storecredit/purchase Tests
  // =========================================================================

  describe('postPurchaseCredit', () => {
    it('should return success on successful purchase', async () => {
      (mockStoreCreditService.PurchaseStoreCredit as jest.Mock).mockResolvedValue({
        status: 200,
        success: true,
        result: {
          code: 'NEW123',
          referenceId: 'ref-123',
          squareOrderId: 'sq-order-123',
          amount: { amount: 5000, currency: CURRENCY.USD },
          last4: '1234',
          receiptUrl: 'https://squareup.com/receipt/test',
        },
      });

      const body = {
        recipientNameFirst: 'John',
        recipientNameLast: 'Doe',
        recipientEmail: 'john@example.com',
        senderName: 'Jane',
        senderEmail: 'jane@example.com',
        amount: { amount: 5000, currency: CURRENCY.USD },
        addMessage: 'Happy Birthday!',
        nonce: 'payment-nonce-123',
        sendEmailToRecipient: true,
        recipientMessage: 'Enjoy!',
      };
      const result = await controller.postPurchaseCredit(body);

      expect(result.status).toBe(200);
    });

    it('should throw HttpException on purchase failure', async () => {
      (mockStoreCreditService.PurchaseStoreCredit as jest.Mock).mockResolvedValue({
        status: 400,
        success: false,
        error: [{ code: 'PAYMENT_FAILED', category: 'PAYMENT_ERROR', detail: '' }],
      });

      const body = {
        recipientNameFirst: 'John',
        recipientNameLast: 'Doe',
        recipientEmail: 'john@example.com',
        senderName: 'Jane',
        senderEmail: 'jane@example.com',
        amount: { amount: 5000, currency: CURRENCY.USD },
        addMessage: '',
        nonce: 'invalid-nonce',
        sendEmailToRecipient: false,
        recipientMessage: '',
      };

      await expect(controller.postPurchaseCredit(body)).rejects.toThrow(HttpException);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/storecredit/issue Tests
  // =========================================================================

  describe('postIssueCredit', () => {
    it('should return success on successful issue', async () => {
      (mockStoreCreditService.IssueCredit as jest.Mock).mockResolvedValue({
        status: 200,
        credit_code: 'ISSUED123',
      });

      const body = {
        recipientNameFirst: 'John',
        recipientNameLast: 'Doe',
        recipientEmail: 'john@example.com',
        amount: { amount: 2500, currency: CURRENCY.USD },
        addedBy: 'admin',
        reason: 'Refund for order',
        expiration: null,
        creditType: StoreCreditType.MONEY,
      };
      const result = await controller.postIssueCredit(body);

      expect(result.status).toBe(200);
    });

    it('should throw HttpException on issue failure', async () => {
      (mockStoreCreditService.IssueCredit as jest.Mock).mockResolvedValue({
        status: 500,
        credit_code: '',
      });

      const body = {
        recipientNameFirst: 'John',
        recipientNameLast: 'Doe',
        recipientEmail: 'john@example.com',
        amount: { amount: 2500, currency: CURRENCY.USD },
        addedBy: 'admin',
        reason: 'Refund',
        expiration: null,
        creditType: StoreCreditType.MONEY,
      };

      await expect(controller.postIssueCredit(body)).rejects.toThrow(HttpException);
    });
  });
});
