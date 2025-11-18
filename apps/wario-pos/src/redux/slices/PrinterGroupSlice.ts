import { createAsyncThunk, createEntityAdapter, createSlice, type EntityState, type PayloadAction } from "@reduxjs/toolkit";
import type { AxiosResponse } from "axios";

import { type PrinterGroup } from "@wcp/wario-shared";

import axiosInstance from "@/utils/axios";
export const PrinterGroupAdapter = createEntityAdapter<PrinterGroup>();
export const { selectAll: getPrinterGroups, selectById: getPrinterGroupById, selectIds: getPrinterGroupIds } =
  PrinterGroupAdapter.getSelectors();

export interface OrderManagerState {
  printerGroups: EntityState<PrinterGroup, string>;
  requestStatus: 'NONE' | 'START' | 'SUCCESS' | 'FAILED';
}

const initialState: OrderManagerState = {
  printerGroups: PrinterGroupAdapter.getInitialState(),
  requestStatus: "NONE"
}

export const queryPrinterGroups = createAsyncThunk<PrinterGroup[], string>(
  'printerGroup/init',
  async (token: string) => {
    const response: AxiosResponse<PrinterGroup[]> = await axiosInstance.get('/api/v1/menu/printergroup', {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });
    return response.data;
  }
);

const PrinterGroupSlice = createSlice({
  name: 'printerGroup',
  initialState,
  reducers: {
    receivePrinterGroups(state, action: PayloadAction<PrinterGroup[]>) {
      PrinterGroupAdapter.upsertMany(state.printerGroups, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(queryPrinterGroups.fulfilled, (state, action) => {
        PrinterGroupAdapter.upsertMany(state.printerGroups, action.payload);
        state.requestStatus = 'SUCCESS';
      })
      .addCase(queryPrinterGroups.pending, (state) => {
        state.requestStatus = 'START';
      })
      .addCase(queryPrinterGroups.rejected, (state) => {
        state.requestStatus = 'FAILED';
      })
  },
});

export const PrinterGroupActions = PrinterGroupSlice.actions;
export const PrinterGroupReducer = PrinterGroupSlice.reducer;
