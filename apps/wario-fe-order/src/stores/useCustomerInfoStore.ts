import { parsePhoneNumber } from 'libphonenumber-js/core';
import type { MetadataJson } from 'libphonenumber-js/core';
import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { CustomerInfoData } from '@wcp/wario-shared/types';
import { ZodEmailSchema } from '@wcp/wario-ux-shared/common';
import PHONE_METADATA from '@wcp/wario-ux-shared/phone-metadata.custom.json';

const LIBPHONE_METADATA = PHONE_METADATA as unknown as MetadataJson;

export type CustomerInfoRHF = CustomerInfoData & { mobileNumRaw: string };

export const customerInfoSchema = z.object({
  givenName: z.string().min(1, 'Please enter your given name.').min(2, 'Please enter the full name.'),
  familyName: z.string().min(1, 'Please enter your family name.').min(2, 'Please enter the full name.'),
  mobileNum: z.string(),
  mobileNumRaw: z
    .string()
    .min(1, 'Please enter a valid US mobile phone number.')
    .refine(
      (v) => {
        try {
          return parsePhoneNumber(v, LIBPHONE_METADATA).isValid();
        } catch {
          return false;
        }
      },
      {
        message:
          "Please enter a valid US mobile phone number. If you don't have one please, send us an email so we can provide alternate instructions.",
      },
    ),
  email: ZodEmailSchema,
  referral: z.string(),
});

interface CustomerInfoActions {
  setCustomerInfo: (info: CustomerInfoRHF) => void;
  reset: () => void;
}

export type CustomerInfoStore = CustomerInfoRHF & CustomerInfoActions;

const initialState: CustomerInfoRHF = {
  givenName: '',
  familyName: '',
  mobileNum: '',
  mobileNumRaw: '',
  email: '',
  referral: '',
};

export const useCustomerInfoStore = create<CustomerInfoStore>()(
  devtools(
    (set) => ({
      // State
      ...initialState,

      // Actions
      setCustomerInfo: (info) => {
        try {
          const parsedNumber = parsePhoneNumber(info.mobileNumRaw, LIBPHONE_METADATA);
          set(
            {
              givenName: info.givenName,
              familyName: info.familyName,
              email: info.email,
              referral: info.referral,
              mobileNumRaw: info.mobileNumRaw,
              mobileNum: parsedNumber.formatNational(),
            },
            false,
            'setCustomerInfo',
          );
        } catch {
          // Invalid phone number, don't update
        }
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'customer-info-store' },
  ),
);

// Selectors
export const selectCustomerInfo = (state: CustomerInfoStore): CustomerInfoRHF => ({
  givenName: state.givenName,
  familyName: state.familyName,
  mobileNum: state.mobileNum,
  mobileNumRaw: state.mobileNumRaw,
  email: state.email,
  referral: state.referral,
});
