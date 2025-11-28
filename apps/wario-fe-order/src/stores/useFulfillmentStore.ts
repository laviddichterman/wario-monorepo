import type { AxiosResponse } from 'axios';
import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type {
  DeliveryAddressValidateRequest,
  DeliveryAddressValidateResponse,
  DeliveryInfoDto,
  DineInInfoDto,
  FulfillmentData,
  NullablePartial,
} from '@wcp/wario-shared';
import { WDateUtils } from '@wcp/wario-shared';

import axiosInstance from '@/utils/axios';

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
  validateDeliveryAddress: (formData: DeliveryInfoFormData) => Promise<void>;
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
            },
            false,
            'setService'
          );
        }
      },

      setDate: (date) => {
        set(
          (state) => ({
            selectedDate: date,
            hasSelectedDateExpired: state.hasSelectedDateExpired && date === null,
          }),
          false,
          'setDate'
        );
      },

      setTime: (time) => {
        set(
          (state) => ({
            selectedTime: time,
            hasSelectedTimeExpired: state.hasSelectedTimeExpired && time === null,
          }),
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

      validateDeliveryAddress: async (formData) => {
        // Set pending state with partial delivery info
        set(
          {
            deliveryInfo: {
              address: formData.address,
              address2: formData.address2,
              zipcode: formData.zipcode,
              deliveryInstructions: formData.deliveryInstructions,
              validation: null,
            },
            deliveryValidationStatus: 'PENDING',
          },
          false,
          'validateDeliveryAddress/pending'
        );

        try {
          const request: DeliveryAddressValidateRequest = {
            fulfillmentId: formData.fulfillmentId,
            address: formData.address,
            city: 'Seattle',
            state: 'WA',
            zipcode: formData.zipcode,
          };

          const response: AxiosResponse<DeliveryAddressValidateResponse> = await axiosInstance.get(
            '/api/v1/addresses',
            { params: request }
          );

          const validation = response.data;

          set(
            (state) => ({
              deliveryInfo: state.deliveryInfo
                ? Object.assign({}, state.deliveryInfo, { validation })
                : null,
              deliveryValidationStatus: validation.in_area ? 'VALID' : 'OUTSIDE_RANGE',
            }),
            false,
            'validateDeliveryAddress/fulfilled'
          );
        } catch {
          set({ deliveryValidationStatus: 'INVALID' }, false, 'validateDeliveryAddress/rejected');
        }
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'fulfillment-store' }
  )
);

// Selectors
export const selectFulfillmentState = (state: FulfillmentStore): FulfillmentState => ({
  hasSelectedTimeExpired: state.hasSelectedTimeExpired,
  hasSelectedDateExpired: state.hasSelectedDateExpired,
  selectedService: state.selectedService,
  selectedDate: state.selectedDate,
  selectedTime: state.selectedTime,
  dineInInfo: state.dineInInfo,
  deliveryInfo: state.deliveryInfo,
  hasAgreedToTerms: state.hasAgreedToTerms,
  deliveryValidationStatus: state.deliveryValidationStatus,
});

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
 * Computes the service date/time from selected date and time
 */
export const selectServiceDateTime = (state: FulfillmentStore) => {
  const { selectedDate, selectedTime } = state;
  return selectedDate !== null && selectedTime !== null
    ? WDateUtils.ComputeServiceDateTime({ selectedDate, selectedTime })
    : null;
};
