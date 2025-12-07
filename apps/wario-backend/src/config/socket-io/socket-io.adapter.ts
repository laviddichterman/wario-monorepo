import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { type AppConfigService } from '../app-config.service';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    private app: INestApplicationContext,
    private configService: AppConfigService,
  ) {
    super(app);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createIOServer(port: number, options?: any): any {
    const corsOrigins = this.configService.corsOrigins;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const optionsCors = options?.cors as Record<string, any> | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const optionsWithCors = {
      ...options,
      cors: {
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
        ...(typeof optionsCors === 'object' ? optionsCors : {}),
      },
    };

    return super.createIOServer(port, optionsWithCors);
  }
}
