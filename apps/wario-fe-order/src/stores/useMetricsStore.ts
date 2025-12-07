import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { type Metrics } from '@wcp/wario-shared';

import { NUM_STAGES, type STEPPER_STAGE_ENUM } from '@/config';

type MetricsState = Omit<Metrics, 'pageLoadTime'>;

interface MetricsActions {
  incrementTimeBumps: () => void;
  incrementTipAdjusts: () => void;
  incrementTipFixes: () => void;
  setTimeToFirstProductIfUnset: (ticks: number) => void;
  setTimeToStage: (stage: STEPPER_STAGE_ENUM, ticks: number) => void;
  setTimeToServiceDate: (ticks: number) => void;
  setTimeToServiceTime: (ticks: number) => void;
  setSubmitTime: (ticks: number) => void;
  setUserAgent: (useragent: string) => void;
}

export type MetricsStore = MetricsState & MetricsActions;

const initialState: MetricsState = {
  submitTime: 0,
  useragent: '',
  timeToServiceDate: 0,
  timeToServiceTime: 0,
  timeToFirstProduct: 0,
  timeToStage: Array<number>(NUM_STAGES - 1).fill(0),
  numTimeBumps: 0,
  numTipAdjusts: 0,
  numTipFixed: 0,
};

export const useMetricsStore = create<MetricsStore>()(
  devtools(
    (set) => ({
      // State
      ...initialState,

      // Actions
      incrementTimeBumps: () => {
        set((state) => ({ numTimeBumps: state.numTimeBumps + 1 }), false, 'incrementTimeBumps');
      },

      incrementTipAdjusts: () => {
        set((state) => ({ numTipAdjusts: state.numTipAdjusts + 1 }), false, 'incrementTipAdjusts');
      },

      incrementTipFixes: () => {
        set((state) => ({ numTipFixed: state.numTipFixed + 1 }), false, 'incrementTipFixes');
      },

      setTimeToFirstProductIfUnset: (ticks) => {
        set(
          (state) => (state.timeToFirstProduct === 0 ? { timeToFirstProduct: ticks } : state),
          false,
          'setTimeToFirstProductIfUnset',
        );
      },

      setTimeToStage: (stage, ticks) => {
        set(
          (state) => {
            const newTimeToStage = [...state.timeToStage];
            newTimeToStage[stage] = newTimeToStage[stage] || ticks;
            return { timeToStage: newTimeToStage };
          },
          false,
          'setTimeToStage',
        );
      },

      setTimeToServiceDate: (ticks) => {
        set({ timeToServiceDate: ticks }, false, 'setTimeToServiceDate');
      },

      setTimeToServiceTime: (ticks) => {
        set({ timeToServiceTime: ticks }, false, 'setTimeToServiceTime');
      },

      setSubmitTime: (ticks) => {
        set({ submitTime: ticks }, false, 'setSubmitTime');
      },

      setUserAgent: (useragent) => {
        set({ useragent: `${useragent} FEV: ${__APP_VERSION__}` }, false, 'setUserAgent');
      },
    }),
    { name: 'metrics-store' },
  ),
);

// Selectors
export const selectSubmitTime = (state: MetricsStore) => state.submitTime;
export const selectUserAgent = (state: MetricsStore) => state.useragent;
export const selectTimeToServiceDate = (state: MetricsStore) => state.timeToServiceDate;
export const selectTimeToServiceTime = (state: MetricsStore) => state.timeToServiceTime;
export const selectTimeToFirstProduct = (state: MetricsStore) => state.timeToFirstProduct;
export const selectTimeToStage = (state: MetricsStore) => state.timeToStage;
export const selectNumTimeBumps = (state: MetricsStore) => state.numTimeBumps;
export const selectNumTipAdjusts = (state: MetricsStore) => state.numTipAdjusts;
export const selectNumTipFixed = (state: MetricsStore) => state.numTipFixed;
