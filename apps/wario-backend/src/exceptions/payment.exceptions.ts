/**
 * Custom domain exceptions for payment-related errors.
 * These exceptions provide structured error responses following the WError format.
 */
import {
  BadGatewayException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { WError } from '@wcp/wario-shared';

/**
 * Thrown when a payment processing error occurs with Square.
 */
export class PaymentProcessingException extends BadGatewayException {
  constructor(errors: WError[]) {
    super({
      success: false,
      error: errors,
    });
  }
}

/**
 * Thrown when a store credit code is invalid or not found.
 */
export class StoreCreditNotFoundException extends BadRequestException {
  constructor(creditCode: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'STORE_CREDIT_NOT_FOUND',
        detail: `Store credit ${creditCode} not found or invalid`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a store credit has insufficient balance.
 */
export class InsufficientCreditException extends UnprocessableEntityException {
  constructor(creditCode: string, available: number, requested: number) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'INSUFFICIENT_CREDIT',
        detail: `Store credit ${creditCode} has insufficient balance. Available: ${String(available)}, Requested: ${String(requested)}`,
      }] satisfies WError[],
    });
  }
}

/**
 * Thrown when a payment amount is invalid.
 */
export class InvalidPaymentAmountException extends BadRequestException {
  constructor(detail: string) {
    super({
      success: false,
      error: [{
        category: 'INVALID_REQUEST_ERROR',
        code: 'INVALID_PAYMENT_AMOUNT',
        detail,
      }] satisfies WError[],
    });
  }
}
