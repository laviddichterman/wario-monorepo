import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
  SocketIoReducer,
} from '@wcp/wario-ux-shared/redux';

import ListeningMiddleware from "./slices/ListeningMiddleware";
import { SocketIoMiddleware } from "./slices/SocketIoMiddleware";
import StepperReducer from "./slices/StepperSlice";
import WCartReducer from './slices/WCartSlice';
import WCustomerInfoReducer from "./slices/WCustomerInfoSlice";
import WCustomizerReducer from './slices/WCustomizerSlice';
import WFulfillmentReducer from './slices/WFulfillmentSlice';
import WMetricsReducer from './slices/WMetricsSlice';
import WPaymentReducer from "./slices/WPaymentSlice";

export const RootReducer = combineReducers({
  fulfillment: WFulfillmentReducer,
  customizer: WCustomizerReducer,
  ci: WCustomerInfoReducer,
  cart: WCartReducer,
  ws: SocketIoReducer,
  metrics: WMetricsReducer,
  payment: WPaymentReducer,
  stepper: StepperReducer
});

export const store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware().concat([SocketIoMiddleware, ListeningMiddleware.middleware])
  },
});

export type RootState = ReturnType<typeof RootReducer>;
export type AppDispatch = typeof store.dispatch;