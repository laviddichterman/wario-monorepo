import type * as Square from '@square/web-sdk';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { TipSelection, ValidateAndLockCreditResponseValid } from '@wcp/wario-shared';

// Types
export interface StoreCreditValidation {
  code: string;
  validation: ValidateAndLockCreditResponseValid;
  createdAt: number;
}

export interface PaymentState {
  storeCreditValidations: StoreCreditValidation[];

  selectedTip: TipSelection | null;
  acknowledgeInstructionsDialogue: boolean;
  specialInstructions: string | null;
  storeCreditInput: string;
  squareTokenErrors: Square.TokenError[];
}

interface PaymentActions {
  // Tip
  setTip: (tip: TipSelection) => void;

  // Store Credit
  clearCreditCode: () => void;
  setStoreCreditInput: (code: string) => void;
  setStoreCreditValidation: (code: string, validation: ValidateAndLockCreditResponseValid) => void;

  // Square
  setSquareTokenizationErrors: (errors: Square.TokenError[]) => void;

  // Special Instructions
  setSpecialInstructions: (instructions: string) => void;
  setAcknowledgeInstructionsDialogue: (acknowledge: boolean) => void;

  // Reset actions
  resetSubmitState: () => void;
  reset: () => void;
}

export type PaymentStore = PaymentState & PaymentActions;

const initialState: PaymentState = {
  storeCreditValidations: [],
  squareTokenErrors: [],
  selectedTip: null,
  acknowledgeInstructionsDialogue: false,
  specialInstructions: null,
  storeCreditInput: '',
};

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    (set) => ({
      // State
      ...initialState,

      // Actions
      setTip: (tip) => {
        set({ selectedTip: tip }, false, 'setTip');
      },

      clearCreditCode: () => {
        set(
          {
            storeCreditInput: '',
            storeCreditValidations: [],
          },
          false,
          'clearCreditCode',
        );
      },

      setStoreCreditInput: (code) => {
        set({ storeCreditInput: code }, false, 'setStoreCreditInput');
      },

      setStoreCreditValidation: (code, validation) => {
        set(
          {
            storeCreditValidations: [{ code, validation, createdAt: Date.now() }],
          },
          false,
          'setStoreCreditValidation',
        );
      },

      setSquareTokenizationErrors: (errors) => {
        set({ squareTokenErrors: errors }, false, 'setSquareTokenizationErrors');
      },

      setSpecialInstructions: (instructions) => {
        set({ specialInstructions: instructions }, false, 'setSpecialInstructions');
      },

      setAcknowledgeInstructionsDialogue: (acknowledge) => {
        set(
          {
            specialInstructions: null,
            acknowledgeInstructionsDialogue: acknowledge,
          },
          false,
          'setAcknowledgeInstructionsDialogue',
        );
      },

      resetSubmitState: () => {
        set(
          {
            squareTokenErrors: [],
          },
          false,
          'resetSubmitState',
        );
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'payment-store' },
  ),
);

// Selectors
export const selectStoreCreditValidations = (state: PaymentStore) => state.storeCreditValidations;
export const selectSelectedTip = (state: PaymentStore) => state.selectedTip;
export const selectAcknowledgeInstructionsDialogue = (state: PaymentStore) => state.acknowledgeInstructionsDialogue;
export const selectSpecialInstructions = (state: PaymentStore) => state.specialInstructions;
export const selectStoreCreditInput = (state: PaymentStore) => state.storeCreditInput;
export const selectSquareTokenErrors = (state: PaymentStore) => state.squareTokenErrors;

// Computed selectors
export const selectTotalStoreCreditsApplied = (state: PaymentStore) =>
  state.storeCreditValidations.reduce((acc, v) => acc + v.validation.amount.amount, 0);
