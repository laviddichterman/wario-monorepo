import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { STEPPER_STAGE_ENUM } from "../../config";

export interface StepperState {
  stage: STEPPER_STAGE_ENUM;
}

const initialState: StepperState = {
  stage: STEPPER_STAGE_ENUM.TIMING
}

const StepperSlice = createSlice({
  name: 'stepper',
  initialState: initialState,
  reducers: {
    setStage(state, action: PayloadAction<STEPPER_STAGE_ENUM>) {
      state.stage = action.payload;
    },
    nextStage(state) {
      state.stage = state.stage + 1;
    },
    backStage(state) {
      state.stage = state.stage - 1;
    }
  }
});

export const { setStage, nextStage, backStage } = StepperSlice.actions;

export default StepperSlice.reducer;
