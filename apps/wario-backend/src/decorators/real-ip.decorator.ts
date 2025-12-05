import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Parameter decorator that extracts the real client IP address.
 * 
 * Checks headers in order:
 * 1. x-real-ip (set by some reverse proxies)
 * 2. x-forwarded-for (standard proxy header, takes first IP)
 * 3. req.socket.remoteAddress (direct connection)
 * 
 * @example
 * ```typescript
 * @Post()
 * async createOrder(@RealIp() ipAddress: string) {
 *   // ipAddress contains the client's real IP
 * }
 * ```
 */
export const RealIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Check x-real-ip first (set by some reverse proxies like nginx)
    const xRealIp = request.headers['x-real-ip'];
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    // Check x-forwarded-for (standard proxy header)
    // Format: "client, proxy1, proxy2" - we want the first one (client)
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const forwardedIp = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor.split(',')[0].trim();
      return forwardedIp;
    }

    // Fall back to direct socket connection
    return request.socket.remoteAddress ?? '';
  },
);
