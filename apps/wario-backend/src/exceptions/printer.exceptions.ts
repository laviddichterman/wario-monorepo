/**
 * Custom domain exceptions for printer-related errors.
 * These exceptions provide structured error responses following the WError format.
 */
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

import type { WError } from '@wcp/wario-shared';

/**
 * Thrown when a printer group cannot be found by ID.
 */
export class PrinterGroupNotFoundException extends NotFoundException {
  constructor(printerGroupId: string) {
    super({
      success: false,
      error: [
        {
          category: 'INVALID_REQUEST_ERROR',
          code: 'PRINTER_GROUP_NOT_FOUND',
          detail: `Printer group ${printerGroupId} not found`,
        },
      ] satisfies WError[],
    });
  }
}

/**
 * Thrown when printer group creation or update fails unexpectedly.
 */
export class PrinterGroupOperationException extends InternalServerErrorException {
  constructor(operation: string, detail: string) {
    super({
      success: false,
      error: [
        {
          category: 'API_ERROR',
          code: 'PRINTER_GROUP_OPERATION_FAILED',
          detail: `Failed to ${operation}: ${detail}`,
        },
      ] satisfies WError[],
    });
  }
}
