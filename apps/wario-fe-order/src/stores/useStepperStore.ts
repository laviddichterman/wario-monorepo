import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export enum STEPPER_STAGE_ENUM {
  TIMING,
  ADD_MAIN_PRODUCT,
  ADD_SUPP_PRODUCT,
  CUSTOMER_INFO,
  REVIEW_ORDER,
  CHECK_OUT
}

export const NUM_STAGES = Object.keys(STEPPER_STAGE_ENUM).length / 2;

interface StepperState {
  stage: STEPPER_STAGE_ENUM;
}

interface StepperActions {
  setStage: (stage: STEPPER_STAGE_ENUM) => void;
  nextStage: () => void;
  backStage: () => void;
}

export type StepperStore = StepperState & StepperActions;

export const useStepperStore = create<StepperStore>()(
  devtools(
    (set) => ({
      // State
      stage: STEPPER_STAGE_ENUM.TIMING,

      // Actions
      setStage: (stage) => { set({ stage }, false, 'setStage'); },
      nextStage: () => { set((state) => ({ stage: state.stage + 1 }), false, 'nextStage'); },
      backStage: () => { set((state) => ({ stage: state.stage - 1 }), false, 'backStage'); },
    }),
    { name: 'stepper-store' }
  )
);

// Selectors
export const selectStage = (state: StepperStore) => state.stage;
