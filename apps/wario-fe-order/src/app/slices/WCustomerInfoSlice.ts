import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  parsePhoneNumber,
} from 'libphonenumber-js/core';
import { type MetadataJson } from 'libphonenumber-js/core';
import { z } from "zod";

import { type CustomerInfoDto } from "@wcp/wario-shared";
import { PHONE_METADATA, ZodEmailSchema } from "@wcp/wario-ux-shared";

const LIBPHONE_METADATA = PHONE_METADATA as unknown as MetadataJson;

export type CustomerInfoRHF = CustomerInfoDto & { mobileNumRaw: string };
export const customerInfoSchema = z.object({
  givenName: z.string().min(1, "Please enter your given name.").min(2, "Please enter the full name."),
  familyName: z.string().min(1, "Please enter your family name.").min(2, "Please enter the full name."),
  mobileNum: z.string(),
  mobileNumRaw: z.string()
    .min(1, "Please enter a valid US mobile phone number.")
    .refine((v) => {
      try { return parsePhoneNumber(v, LIBPHONE_METADATA).isValid(); }
      catch { return false; }
    }, { message: "Please enter a valid US mobile phone number. If you don't have one please, send us an email so we can provide alternate instructions." }),
  email: ZodEmailSchema,
  referral: z.string(),
});

const initialState: CustomerInfoRHF = {
  givenName: "",
  familyName: "",
  mobileNum: "",
  mobileNumRaw: "",
  email: "",
  referral: ""
}

const WCustomerInfoSlice = createSlice({
  name: 'ci',
  initialState: initialState,
  reducers: {
    setCustomerInfo(state, action: PayloadAction<CustomerInfoRHF>) {
      try {
        const parsedNumber = parsePhoneNumber(action.payload.mobileNumRaw, LIBPHONE_METADATA);
        state.mobileNum = parsedNumber.formatNational();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e: unknown) {
        return;
      }
      state.mobileNumRaw = action.payload.mobileNumRaw;
      state.email = action.payload.email;
      state.familyName = action.payload.familyName;
      state.givenName = action.payload.givenName;
      state.referral = action.payload.referral;
    }
  }
});



export const { setCustomerInfo } = WCustomerInfoSlice.actions;


export default WCustomerInfoSlice.reducer;
