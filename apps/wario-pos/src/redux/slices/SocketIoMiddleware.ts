import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared';

import { HOST_API, SOCKETIO } from '@/config';

export const SocketIoMiddleware = MiddlewareGenerator(HOST_API, SOCKETIO.ns);