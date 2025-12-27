import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

interface RequestWithBody {
  body: unknown;
  method: string;
  url: string;
}

@Injectable()
export class RequestDebugLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestDebugLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithBody>();

    const { method, url, body } = request;
    // Log request details at debug level
    if (body !== undefined && body !== null && Object.keys(body).length > 0) {
      this.logger.debug(
        {
          body,
        },
        `${method} ${url}`,
      );
    }

    return next.handle();
  }
}
