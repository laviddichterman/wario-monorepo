/**
 * Service for sending error notifications.
 * Centralizes the logic for notifying administrators about critical errors.
 */
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import type { WError } from '@wcp/wario-shared';

import { DataProviderService } from '../data-provider/data-provider.service';
import { GoogleService } from '../google/google.service';

export interface ErrorContext {
  path: string;
  method: string;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  userId?: string;
  ip?: string;
}

@Injectable()
export class ErrorNotificationService {
  constructor(
    private readonly googleService: GoogleService,
    private readonly dataProvider: DataProviderService,
    @InjectPinoLogger(ErrorNotificationService.name)
    private readonly logger: PinoLogger,
  ) { }


  /**
   * Send an email notification for critical errors.
   * This is fire-and-forget - errors in sending are logged but not thrown.
   *
   * @param context - Request context information
   * @param errors - Array of WError objects describing the error
   * @param statusCode - HTTP status code of the error
   */
  async sendCriticalErrorEmail(
    context: ErrorContext,
    errors: WError[],
    statusCode: number,
  ): Promise<void> {
    try {
      const emailAddress = this.dataProvider.KeyValueConfig.EMAIL_ADDRESS;
      if (!emailAddress) {
        this.logger.warn('Cannot send error notification: EMAIL_ADDRESS not configured');
        return;
      }

      const timestamp = new Date().toISOString();
      const htmlBody = this.buildErrorEmailHtml(context, errors, statusCode, timestamp);

      await this.googleService.SendEmail(
        emailAddress,
        { name: emailAddress, address: 'dave@windycitypie.com' },
        `[${String(statusCode)}] ERROR: ${context.method} ${context.path}`,
        'dave@windycitypie.com',
        htmlBody,
      );

      this.logger.info(`Sent error notification email for ${context.method} ${context.path}`);
    } catch (emailError: unknown) {
      // Log but don't throw - we don't want email failures to affect the response
      this.logger.error(
        { err: emailError },
        'Failed to send error notification email',
      );
    }
  }

  /**
   * Determine if an error should trigger a notification.
   * Currently notifies for:
   * - All 5xx errors on order-related endpoints
   * - All 5xx errors on payment-related endpoints
   */
  shouldNotify(path: string, statusCode: number): boolean {
    if (statusCode < 500) {
      return false;
    }

    const criticalPaths = ['/order', '/store-credit', '/payment'];
    return criticalPaths.some(criticalPath => path.includes(criticalPath));
  }

  private buildErrorEmailHtml(
    context: ErrorContext,
    errors: WError[],
    statusCode: number,
    timestamp: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #d32f2f;">Critical Error in Order Processing</h1>
          <p><strong>Contact Dave immediately if this is during service hours.</strong></p>
          
          <h2>Error Details</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status Code</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${String(statusCode)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Method</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${context.method}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Path</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${context.path}</td>
            </tr>
            ${context.ip ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Client IP</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${context.ip}</td>
            </tr>
            ` : ''}
          </table>

          <h2>Errors</h2>
          <pre style="background: #f5f5f5; padding: 15px; overflow-x: auto;">
${JSON.stringify(errors, null, 2)}
          </pre>

          ${context.body ? `
          <h2>Request Body</h2>
          <pre style="background: #f5f5f5; padding: 15px; overflow-x: auto;">
${JSON.stringify(context.body, null, 2)}
          </pre>
          ` : ''}

          ${context.params && Object.keys(context.params).length > 0 ? `
          <h2>URL Parameters</h2>
          <pre style="background: #f5f5f5; padding: 15px; overflow-x: auto;">
${JSON.stringify(context.params, null, 2)}
          </pre>
          ` : ''}
        </body>
      </html>
    `;
  }
}
