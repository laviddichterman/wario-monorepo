import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared';

import { HOST_API, SOCKETIO } from '../../config';
import type { RootState } from '../store';

export const SocketIoMiddleware = MiddlewareGenerator<RootState>(HOST_API, SOCKETIO.ns);
