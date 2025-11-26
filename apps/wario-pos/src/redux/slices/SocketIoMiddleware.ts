import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared/redux';

import { HOST_API, SOCKETIO } from '@/config';

export const SocketIoMiddleware = MiddlewareGenerator(HOST_API, SOCKETIO.ns);