import type { Middleware } from 'redux';
import { io, type Socket } from "socket.io-client";

import type { FulfillmentConfig, ICatalog, IWSettings } from '@wcp/wario-shared';

import { receiveCatalog, receiveFulfillments, receiveServerTime, receiveSettings, setConnected, setCurrentTime, setFailed, startConnection, TIMING_POLLING_INTERVAL } from './SocketIoSlice';
import type { SocketIoState } from './SocketIoSlice';

export const SocketIoMiddleware = <RootStateType extends { ws: SocketIoState }>(hostAPI: string, namespace: string) => {
  const CurrySocketIoMiddleware: Middleware<unknown, RootStateType> = store => {
    let socket: Socket;

    return next => action => {
      if (startConnection.match(action)) {
        socket = io(`${hostAPI}/${namespace}`, {
          autoConnect: true, secure: true,
          transports: ["websocket", "polling"],
          withCredentials: true
        });
        socket.on('connect', () => {
          store.dispatch(setConnected());
          socket.on('disconnect', () => {
            store.dispatch(setFailed());
          });
        });
        socket.on("WCP_FULFILLMENTS", (data: Record<string, FulfillmentConfig>) => {
          store.dispatch(receiveFulfillments(Object.values(data)));
        });
        socket.on("WCP_SERVER_TIME", (data: { time: string; tz: string; }) => {
          if (store.getState().ws.serverTime === null) {
            const checkTiming = () => {
              store.dispatch(setCurrentTime({ currentLocalTime: Date.now(), ticksElapsed: TIMING_POLLING_INTERVAL }));
            }
            setInterval(checkTiming, TIMING_POLLING_INTERVAL);
          }
          store.dispatch(receiveServerTime(data));
        });
        socket.on("WCP_SETTINGS", (data: IWSettings) => {
          store.dispatch(receiveSettings(data));
        });
        socket.on("WCP_CATALOG", (data: ICatalog) => {
          store.dispatch(receiveCatalog(data));
        });
      }
      next(action);
    }
  }
  return CurrySocketIoMiddleware;
}