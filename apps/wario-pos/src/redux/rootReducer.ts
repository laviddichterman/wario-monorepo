import { combineReducers } from 'redux';

// slices
import { OrdersReducer } from './slices/OrdersSlice';
import { PrinterGroupReducer } from './slices/PrinterGroupSlice';
// ----------------------------------------------------------------------

export const rootReducer = combineReducers({
  orders: OrdersReducer,
  printerGroup: PrinterGroupReducer,
});
