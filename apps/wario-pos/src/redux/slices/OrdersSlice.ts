import { createAsyncThunk, createEntityAdapter, createSlice, type EntityState, type PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";
import { enqueueSnackbar } from 'notistack';

import { type FulfillmentTime, type ResponseSuccess, type WOrderInstance } from "@wcp/wario-shared";

import axiosInstance from "@/utils/axios";
import { uuidv4 } from "@/utils/uuidv4";

// import { parseISO, subDays } from "date-fns";
export const WOrderInstanceAdapter = createEntityAdapter<WOrderInstance>();
export const { selectAll: getWOrderInstances, selectById: getWOrderInstanceById, selectIds: getWOrderInstanceIds } =
  WOrderInstanceAdapter.getSelectors();

type RequestStatus = 'FAILED' | 'PENDING' | 'IDLE';
export interface OrderManagerState {
  orders: EntityState<WOrderInstance, string>;
  requestStatus: RequestStatus;
  pollingStatus: RequestStatus;
}

const initialState: OrderManagerState = {
  orders: WOrderInstanceAdapter.getInitialState(),
  requestStatus: 'IDLE',
  pollingStatus: "IDLE",
}

export const pollOpenOrders = createAsyncThunk<WOrderInstance[], { token: string; date: string | null; }>(
  'orders/pollOpen',
  async ({ token, date }) => {
    const response: AxiosResponse<WOrderInstance[]> = await axiosInstance.get('/api/v1/order', {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",

      },
      params: { ...(date ? { date } : {}) },
      // params: { ...(date ? { date: WDateUtils.formatISODate(subDays(parseISO(date), 1)) } : { })  },
    });
    return response.data;
  }
);

export const unlockOrders = createAsyncThunk<{ ok: string }, string>(
  'orders/unlock',
  async (token: string) => {
    const response: AxiosResponse<{ ok: string }> = await axiosInstance.put('/api/v1/order/unlock', {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
    return response.data;
  }
);



export interface ConfirmOrderParams {
  token: string;
  orderId: string;
  additionalMessage: string;
}
export const confirmOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, ConfirmOrderParams>(
  'orders/confirm',
  async (params: ConfirmOrderParams) => {
    const response: AxiosResponse<ResponseSuccess<WOrderInstance>> = await axiosInstance.put(`/api/v1/order/${params.orderId}/confirm`, {
      additionalMessage: params.additionalMessage
    }, {
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        'Idempotency-Key': uuidv4()
      }
    });
    return response.data;
  }
);

export interface ForceSendOrderParams {
  token: string;
  orderId: string;
}
export const forceSendOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, ForceSendOrderParams>(
  'orders/send',
  async (params: ForceSendOrderParams) => {
    const response: AxiosResponse<ResponseSuccess<WOrderInstance>> = await axiosInstance.put(`/api/v1/order/${params.orderId}/send`, {
    }, {
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        'Idempotency-Key': uuidv4()
      }
    });
    return response.data;
  }
);

export interface RescheduleOrderParams extends FulfillmentTime {
  token: string;
  orderId: string;
  emailCustomer: boolean;
}
export const rescheduleOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, RescheduleOrderParams>(
  'orders/reschedule',
  async (params: RescheduleOrderParams) => {
    const response: AxiosResponse<ResponseSuccess<WOrderInstance>> = await axiosInstance.put(`/api/v1/order/${params.orderId}/reschedule`, {
      selectedDate: params.selectedDate,
      selectedTime: params.selectedTime,
      emailCustomer: params.emailCustomer
    }, {
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        'Idempotency-Key': uuidv4()
      },
    });
    return response.data;
  }
);

// export const modifyOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, RescheduleOrderParams>(
//   'orders/reschedule',
//   async (params: RescheduleOrderParams) => {
//     // TODO: this doesn't do shit!
//     const response = await axiosInstance.patch(`/api/v1/order/${params.orderId}`, {
//       selectedDate: params.selectedDate,
//       selectedTime: params.selectedTime,
//       emailCustomer: params.emailCustomer
//     }, {
//       headers: {
//         Authorization: `Bearer ${params.token}`,
//         "Content-Type": "application/json",
//         'Idempotency-Key': uuidv4()
//       },
//     });
//     return response.data;
//   }
// );

export interface CancelOrderParams {
  token: string;
  orderId: string;
  reason: string;
  emailCustomer: boolean;
}
export const cancelOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, CancelOrderParams>(
  'orders/cancel',
  async (params: CancelOrderParams) => {
    const response: AxiosResponse<ResponseSuccess<WOrderInstance>> = await axiosInstance.put(`/api/v1/order/${params.orderId}/cancel`, {
      reason: params.reason,
      emailCustomer: params.emailCustomer
    },
      {
        headers: {
          Authorization: `Bearer ${params.token}`,
          "Content-Type": "application/json",
          'Idempotency-Key': uuidv4()
        }
      });
    return response.data;
  }
);

export interface MoveOrderParams {
  token: string;
  orderId: string;
  destination: string;
  additionalMessage: string;
}
export const moveOrder = createAsyncThunk<ResponseSuccess<WOrderInstance>, MoveOrderParams>(
  'orders/move',
  async (params: MoveOrderParams) => {
    const response: AxiosResponse<ResponseSuccess<WOrderInstance>> = await axiosInstance.put(`/api/v1/order/${params.orderId}/move`, {
      destination: params.destination,
      additionalMessage: params.additionalMessage
    },
      {
        headers: {
          Authorization: `Bearer ${params.token}`,
          "Content-Type": "application/json",
          'Idempotency-Key': uuidv4()
        }
      });
    return response.data;
  }
);

const OrdersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    receiveOrder(state, action: PayloadAction<WOrderInstance>) {
      WOrderInstanceAdapter.upsertOne(state.orders, action.payload);
    },
    receiveOrders(state, action: PayloadAction<WOrderInstance[]>) {
      WOrderInstanceAdapter.upsertMany(state.orders, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(pollOpenOrders.fulfilled, (state, action) => {
        // action.payload.forEach(order => {
        //   const currentValue = getWOrderInstanceById(state.orders, order.id);
        //   // @ts-ignore
        //   if (!currentValue || currentValue.__v > order.__v) {
        //     WOrderInstanceAdapter.upsertOne(state.orders, order);
        //   }
        // });
        WOrderInstanceAdapter.upsertMany(state.orders, action.payload);
        state.pollingStatus = 'IDLE';
      })
      .addCase(pollOpenOrders.pending, (state) => {
        state.pollingStatus = 'PENDING';
      })
      .addCase(pollOpenOrders.rejected, (state) => {
        state.pollingStatus = 'FAILED';
      })
      .addCase(confirmOrder.fulfilled, (state, action) => {
        enqueueSnackbar(`Confirmed order for ${action.payload.result.customerInfo.givenName} ${action.payload.result.customerInfo.familyName}.`);
        WOrderInstanceAdapter.upsertOne(state.orders, action.payload.result);
        state.requestStatus = 'IDLE';
      })
      .addCase(confirmOrder.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(confirmOrder.rejected, (state, err) => {
        enqueueSnackbar(`Unable to confirm order. Got error: ${JSON.stringify(err, null, 2)}`, { variant: "error" });
        state.requestStatus = 'FAILED';
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        enqueueSnackbar(`Canceled order for ${action.payload.result.customerInfo.givenName} ${action.payload.result.customerInfo.familyName}.`);
        WOrderInstanceAdapter.upsertOne(state.orders, action.payload.result);
        state.requestStatus = 'IDLE';
      })
      .addCase(cancelOrder.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(cancelOrder.rejected, (state, err) => {
        enqueueSnackbar(`Unable to cancel order. Got error: ${JSON.stringify(err, null, 2)}`, { variant: "error" });
        state.requestStatus = 'FAILED';
      })
      .addCase(rescheduleOrder.fulfilled, (state, action) => {
        enqueueSnackbar(`Rescheduled order for ${action.payload.result.customerInfo.givenName} ${action.payload.result.customerInfo.familyName}.`);
        WOrderInstanceAdapter.upsertOne(state.orders, action.payload.result);
        state.requestStatus = 'IDLE';
      })
      .addCase(rescheduleOrder.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(rescheduleOrder.rejected, (state, err) => {
        enqueueSnackbar(`Unable to reschedule order. Got error: ${JSON.stringify(err, null, 2)}`, { variant: "error" });
        state.requestStatus = 'FAILED';
      })
      .addCase(moveOrder.fulfilled, (state, action) => {
        enqueueSnackbar(`Moved order for ${action.payload.result.customerInfo.givenName} ${action.payload.result.customerInfo.familyName} to ${action.meta.arg.destination}.`);
        WOrderInstanceAdapter.upsertOne(state.orders, action.payload.result);
        state.requestStatus = 'IDLE';
      })
      .addCase(moveOrder.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(moveOrder.rejected, (state, err) => {
        enqueueSnackbar(`Unable to move order. Got error: ${JSON.stringify(err, null, 2)}`, { variant: "error" });
        state.requestStatus = 'FAILED';
      })

      .addCase(unlockOrders.fulfilled, (state) => {
        enqueueSnackbar(`Unlocked orders`);
        state.requestStatus = 'IDLE';
      })
      .addCase(unlockOrders.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(unlockOrders.rejected, (state) => {
        state.requestStatus = 'FAILED';
      })
      .addCase(forceSendOrder.fulfilled, (state, action) => {
        enqueueSnackbar(`Sent order for ${action.payload.result.customerInfo.givenName} ${action.payload.result.customerInfo.familyName}.`);
        WOrderInstanceAdapter.upsertOne(state.orders, action.payload.result);
        state.requestStatus = 'IDLE';
      })
      .addCase(forceSendOrder.pending, (state) => {
        state.requestStatus = 'PENDING';
      })
      .addCase(forceSendOrder.rejected, (state, err) => {
        enqueueSnackbar(`Unable to send order. Got error: ${JSON.stringify(err, null, 2)}`, { variant: "error" });
        state.requestStatus = 'FAILED';
      })
  },
});



export const OrdersActions = OrdersSlice.actions;
export const OrdersReducer = OrdersSlice.reducer;
