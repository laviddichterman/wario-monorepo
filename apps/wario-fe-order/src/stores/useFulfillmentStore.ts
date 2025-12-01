import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type {
  DeliveryInfoDto,
  DineInInfoDto,
  FulfillmentData,
  NullablePartial,
} from '@wcp/wario-shared';
import { WDateUtils } from '@wcp/wario-shared';

// Schemas
export const deliveryAddressSchema = z.object({
  address: z.string().min(1, 'Please enter your street address'),
  address2: z.string(),
  zipcode: z
    .string()
    .regex(/^[0-9]+$/, 'Please enter a 5 digit zipcode')
    .length(5, 'Please enter a 5 digit zipcode'),
  deliveryInstructions: z.string(),
  fulfillmentId: z.string(),
});

export const dineInSchema = z.object({
  partySize: z.coerce
    .number()
    .refine((n) => !Number.isNaN(n), { message: 'Please specify the size of your party.' })
    .int()
    .min(1, 'Please specify the size of your party.'),
});

export type DeliveryInfoFormData = Omit<DeliveryInfoDto, 'validation'> & { fulfillmentId: string };

export type DeliveryValidationStatus = 'IDLE' | 'PENDING' | 'VALID' | 'INVALID' | 'OUTSIDE_RANGE';

export interface FulfillmentState
  extends NullablePartial<Omit<FulfillmentData, 'status' | 'thirdPartyInfo'>> {
  hasSelectedTimeExpired: boolean;
  hasSelectedDateExpired: boolean;
  hasAgreedToTerms: boolean;
  deliveryValidationStatus: DeliveryValidationStatus;
  /** Cached computed service date/time to avoid creating new Date objects */
  serviceDateTime: Date | null;
}

interface FulfillmentActions {
  setService: (service: string) => void;
  setDate: (date: string | null) => void;
  setTime: (time: number | null) => void;
  setHasAgreedToTerms: (agreed: boolean) => void;
  setDineInInfo: (info: DineInInfoDto | null) => void;
  setDeliveryInfo: (info: DeliveryInfoDto | null) => void;
  setSelectedDateExpired: () => void;
  setSelectedTimeExpired: () => void;
  setDeliveryAddressValidation: (status: DeliveryValidationStatus) => void;
  reset: () => void;
}

export type FulfillmentStore = FulfillmentState & FulfillmentActions;

const initialState: FulfillmentState = {
  hasSelectedTimeExpired: false,
  hasSelectedDateExpired: false,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  dineInInfo: null,
  deliveryInfo: null,
  hasAgreedToTerms: false,
  deliveryValidationStatus: 'IDLE',
  serviceDateTime: null,
};

export const useFulfillmentStore = create<FulfillmentStore>()(
  devtools(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setService: (service) => {
        const currentService = get().selectedService;
        if (currentService !== service) {
          set(
            {
              hasSelectedDateExpired: false,
              hasSelectedTimeExpired: false,
              hasAgreedToTerms: false,
              deliveryInfo: null,
              dineInInfo: null,
              selectedService: service,
              serviceDateTime: null,
            },
            false,
            'setService'
          );
        }
      },

      setDate: (date) => {
        set(
          (state) => {
            const serviceDateTime =
              date !== null && state.selectedTime !== null
                ? WDateUtils.ComputeServiceDateTime({ selectedDate: date, selectedTime: state.selectedTime })
                : null;
            return {
              selectedDate: date,
              hasSelectedDateExpired: state.hasSelectedDateExpired && date === null,
              serviceDateTime,
            };
          },
          false,
          'setDate'
        );
      },

      setTime: (time) => {
        set(
          (state) => {
            const serviceDateTime =
              state.selectedDate !== null && time !== null
                ? WDateUtils.ComputeServiceDateTime({ selectedDate: state.selectedDate, selectedTime: time })
                : null;
            return {
              selectedTime: time,
              hasSelectedTimeExpired: state.hasSelectedTimeExpired && time === null,
              serviceDateTime,
            };
          },
          false,
          'setTime'
        );
      },

      setHasAgreedToTerms: (agreed) => {
        set({ hasAgreedToTerms: agreed }, false, 'setHasAgreedToTerms');
      },

      setDineInInfo: (info) => {
        set({ dineInInfo: info }, false, 'setDineInInfo');
      },

      setDeliveryInfo: (info) => {
        set({ deliveryInfo: info }, false, 'setDeliveryInfo');
      },

      setSelectedDateExpired: () => {
        set({ hasSelectedDateExpired: true }, false, 'setSelectedDateExpired');
      },

      setSelectedTimeExpired: () => {
        set({ hasSelectedTimeExpired: true }, false, 'setSelectedTimeExpired');
      },

      setDeliveryAddressValidation: (status) => {
        set({ deliveryValidationStatus: status }, false, 'setDeliveryAddressValidation');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'fulfillment-store' }
  )
);

// Selectors


export const selectSelectedService = (state: FulfillmentStore) => state.selectedService;
export const selectSelectedDate = (state: FulfillmentStore) => state.selectedDate;
export const selectSelectedTime = (state: FulfillmentStore) => state.selectedTime;
export const selectDineInInfo = (state: FulfillmentStore) => state.dineInInfo;
export const selectDeliveryInfo = (state: FulfillmentStore) => state.deliveryInfo;
export const selectHasAgreedToTerms = (state: FulfillmentStore) => state.hasAgreedToTerms;
export const selectDeliveryValidationStatus = (state: FulfillmentStore) =>
  state.deliveryValidationStatus;
export const selectHasSelectedTimeExpired = (state: FulfillmentStore) =>
  state.hasSelectedTimeExpired;
export const selectHasSelectedDateExpired = (state: FulfillmentStore) =>
  state.hasSelectedDateExpired;

/**
 * Returns the cached service date/time.
 * The Date object is computed and cached in state when selectedDate or selectedTime changes.
 */
export const selectServiceDateTime = (state: FulfillmentStore) => state.serviceDateTime;
