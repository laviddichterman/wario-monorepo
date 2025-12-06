import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { scrollToIdOffsetAfterDelay } from '@wcp/wario-ux-shared/common';

import { STEPPER_STAGE_ENUM } from '@/config';

import { useMetricsStore } from './useMetricsStore';



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
    (set, get) => ({
      // State
      stage: STEPPER_STAGE_ENUM.TIMING,

      // Actions
      setStage: (stage) => {
        set({ stage }, false, 'setStage');
        // Scroll to order element on stage change
        scrollToIdOffsetAfterDelay('WARIO_order', 500);
      },
      nextStage: () => {
        const previousStage = get().stage;
        set((state) => ({ stage: state.stage + 1 }), false, 'nextStage');
        // Record stage progression metrics
        useMetricsStore.getState().setTimeToStage(previousStage, Date.now());
        // Scroll to order element on stage change
        scrollToIdOffsetAfterDelay('WARIO_order', 500);
      },
      backStage: () => {
        set((state) => ({ stage: state.stage - 1 }), false, 'backStage');
        // Scroll to order element on stage change
        scrollToIdOffsetAfterDelay('WARIO_order', 500);
      },
    }),
    { name: 'stepper-store' }
  )
);

// Selectors
export const selectStage = (state: StepperStore) => state.stage;
