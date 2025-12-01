import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { ListeningMiddleware } from "./slices/ListeningMiddleware";

/**
 * Redux store configuration.
 * 
 * Components are being migrated to Zustand stores for:
 * - StepperSlice -> useStepperStore
 * - WCartSlice -> useCartStore  
 * - WCustomerInfoSlice -> useCustomerInfoStore
 * - WCustomizerSlice -> useCustomizerStore
 * 
 * These slices are kept in Redux for ListeningMiddleware compatibility.
 * Components should use the Zustand stores from @/stores.
 */

export const RootReducer = combineReducers({
});

export const store = configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ListeningMiddleware.middleware)
});

export type RootState = ReturnType<typeof RootReducer>;
export type AppDispatch = typeof store.dispatch;