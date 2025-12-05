/**
 * Global exception filter for standardized error handling.
 *
 * This filter catches all exceptions and:
 * 1. Logs them with structured context via PinoLogger
 * 2. Transforms them to the WError[] format
 * 3. Sends email notifications for critical errors
 * 4. Returns a consistent error response
 */
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import type { WError } from '@wcp/wario-shared';

import type { ErrorNotificationService } from '../config/error-notification/error-notification.service';

interface ErrorResponseBody {
  success: false;
  error: WError[];
}

interface HttpExceptionResponse {
  success?: boolean;
  error?: WError[];
  message?: string | string[];
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(PinoLogger) private readonly logger: PinoLogger,
    @Optional() private readonly errorNotificationService: ErrorNotificationService | null,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errors, stack: _stack } = this.extractErrorInfo(exception);

    // Log with structured error object - pino will serialize the error properly
    // Note: pino-http already logs the request context, so we only need to log error-specific info
    if (status >= 500) {
      this.logger.error(
        {
          err: exception instanceof Error ? exception : undefined,
          status,
          errors,
        },
        'Request failed with server error',
      );
    } else {
      this.logger.warn(
        {
          status,
          errors,
        },
        'Request failed with client error',
      );
    }

    // Send notification for critical errors (async, fire-and-forget)
    if (this.errorNotificationService?.shouldNotify(request.path, status)) {
      void this.errorNotificationService.sendCriticalErrorEmail(
        {
          path: request.path,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query as Record<string, string>,
          ip: request.ip,
        },
        errors,
        status,
      );
    }

    // Send response
    const responseBody: ErrorResponseBody = {
      success: false,
      error: errors,
    };

    response.status(status).json(responseBody);
  }

  private extractErrorInfo(exception: unknown): {
    status: number;
    errors: WError[];
    stack?: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as HttpExceptionResponse;

      // If response already has WError[] format, use it
      if (exceptionResponse.error && Array.isArray(exceptionResponse.error)) {
        return {
          status,
          errors: exceptionResponse.error,
          stack: exception.stack,
        };
      }

      // Convert message-based response to WError format
      const message = this.extractMessage(exceptionResponse);
      return {
        status,
        errors: [{
          category: this.getCategoryForStatus(status),
          code: this.getCodeForStatus(status),
          detail: message,
        }],
        stack: exception.stack,
      };
    }

    // Handle non-HttpException errors
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errors: [{
          category: 'API_ERROR',
          code: 'INTERNAL_SERVER_ERROR',
          detail: exception.message || 'An unexpected error occurred',
        }],
        stack: exception.stack,
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{
        category: 'API_ERROR',
        code: 'INTERNAL_SERVER_ERROR',
        detail: 'An unexpected error occurred',
      }],
    };
  }

  private extractMessage(response: HttpExceptionResponse): string {
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response.message === 'string') {
      return response.message;
    }
    if (Array.isArray(response.message)) {
      return response.message.join(', ');
    }
    return 'An error occurred';
  }

  private getCategoryForStatus(status: number): string {
    if (status >= 500) {
      return 'API_ERROR';
    }
    if (status === 401) {
      return 'AUTHENTICATION_ERROR';
    }
    if (status === 403) {
      return 'AUTHORIZATION_ERROR';
    }
    return 'INVALID_REQUEST_ERROR';
  }

  private getCodeForStatus(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] ?? 'UNKNOWN_ERROR';
  }
}
