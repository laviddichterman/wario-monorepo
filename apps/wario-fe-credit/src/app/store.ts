import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
  SocketIoReducer,
} from '@wcp/wario-ux-shared';

import { SocketIoMiddleware } from "./slices/SocketIoMiddleware";

export const RootReducer = combineReducers({
  ws: SocketIoReducer,
});

export const store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware().concat([SocketIoMiddleware])
  },
});

export type RootState = ReturnType<typeof RootReducer>;
export type AppDispatch = typeof store.dispatch;
