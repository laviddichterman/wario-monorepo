import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import * as yup from "yup";
import {
  parsePhoneNumber,
} from 'libphonenumber-js/core';
import { LIBPHONE_METADATA } from "../../components/common";
import { YupValidateEmail } from "../../components/hook-form/RHFMailTextField";
import { type CustomerInfoDto } from "@wcp/wario-shared";

export type CustomerInfoRHF = CustomerInfoDto & { mobileNumRaw: string };
export const customerInfoSchema = yup.object().shape({
  givenName: yup.string().ensure().required("Please enter your given name.").min(2, "Please enter the full name."),
  familyName: yup.string().ensure().required("Please enter your family name.").min(2, "Please enter the full name."),
  mobileNumRaw: yup.string().ensure().required("Please enter a valid US mobile phone number.").test('mobileNumRaw',
    "Please enter a valid US mobile phone number.",
    (v) => {
      try {
        const parsedNumber = parsePhoneNumber(v, LIBPHONE_METADATA);
        return parsedNumber.isValid();
      }
      catch (e) {
        return false;
      }
    }),
  email: YupValidateEmail(yup.string()),
  referral: yup.string().ensure().notRequired()
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
      } catch (e) {
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
