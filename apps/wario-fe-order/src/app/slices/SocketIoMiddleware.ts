import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared';

import type { RootState } from '@/app/store';
import { HOST_API, SOCKETIO } from '@/config';

export const SocketIoMiddleware = MiddlewareGenerator<RootState>(HOST_API, SOCKETIO.ns);
