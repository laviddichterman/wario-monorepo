import { Schema } from 'mongoose';

import { type CustomerInfoData } from '@wcp/wario-shared';

export const CustomerInfoSchema = new Schema<CustomerInfoData>(
  {
    givenName: {
      type: String,
      required: true,
    },
    familyName: {
      type: String,
      required: true,
    },
    mobileNum: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    referral: String,
  },
  { _id: false },
);
