import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Metrics } from "@wcp/wcpshared";
import { NUM_STAGES, STEPPER_STAGE_ENUM } from "../../config";
import PACKAGE_INFO from '../../../package.json'

const initialState: Omit<Metrics, 'pageLoadTime'> = {
  submitTime: 0,
  useragent: "",
  timeToServiceDate: 0,
  timeToServiceTime: 0,
  timeToFirstProduct: 0,
  timeToStage: Array(NUM_STAGES-1).fill(0),
  numTimeBumps: 0,
  numTipAdjusts: 0,
  numTipFixed: 0
}

const WMetricsSlice = createSlice({
  name: 'metrics',
  initialState: initialState,
  reducers: {
    // handled by ListenerMiddleware
    incrementTimeBumps(state) {
      state.numTimeBumps = state.numTimeBumps + 1;
    },
    incrementTipAdjusts(state) {
      state.numTipAdjusts = state.numTipAdjusts + 1;
    },
    incrementTipFixes(state) {
      state.numTipFixed = state.numTipFixed + 1;
    },
    // handled manually, be sure to call whenever addToCart is called
    setTimeToFirstProductIfUnset(state, action: PayloadAction<number>) {
      if (state.timeToFirstProduct === 0) {
        state.timeToFirstProduct = action.payload;
      }
    },
    // handled by ListenerMiddleware
    setTimeToStage(state, action: PayloadAction<{ stage: STEPPER_STAGE_ENUM, ticks: number }>) {
      state.timeToStage![action.payload.stage] = action.payload.ticks;
    },
    // handled by the ListenerMiddleware
    setTimeToServiceDate(state, action: PayloadAction<number>) {
      state.timeToServiceDate = action.payload;
    },
    // handled by the ListenerMiddleware
    setTimeToServiceTime(state, action: PayloadAction<number>) {
      state.timeToServiceTime = action.payload;
    },
    // handled by the ListenerMiddleware
    setSubmitTime(state, action: PayloadAction<number>) {
      state.submitTime = action.payload;
    },
    // handled by App.tsx
    setUserAgent(state, action: PayloadAction<string>) {
      state.useragent = `${action.payload} FEV: ${PACKAGE_INFO.version}`;
    }
  }
});

export const { 
  setUserAgent, 
  setTimeToStage, 
  incrementTimeBumps, 
  incrementTipAdjusts, 
  incrementTipFixes, 
  setTimeToFirstProductIfUnset,
  setTimeToServiceDate, 
  setTimeToServiceTime, 
  setSubmitTime } = WMetricsSlice.actions;


export default WMetricsSlice.reducer;
