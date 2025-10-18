import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared';
import { SOCKETIO, HOST_API } from '../../config';
import type { RootState } from '../store';

export const SocketIoMiddleware = MiddlewareGenerator<RootState>(HOST_API, SOCKETIO.ns);
