import { combineReducers } from 'redux';

// slices
import { SocketIoReducer } from '@wcp/wario-ux-shared/redux';

import { CatalogManagerReducer } from './slices/CatalogSlice';
import { OrdersReducer } from './slices/OrdersSlice';
import { PrinterGroupReducer } from './slices/PrinterGroupSlice';
// ----------------------------------------------------------------------

export const rootReducer = combineReducers({
  ws: SocketIoReducer,
  orders: OrdersReducer,
  printerGroup: PrinterGroupReducer,
  catalog: CatalogManagerReducer
});
