import { Schema } from 'mongoose';

import { CURRENCY, type IMoney } from '@wcp/wario-shared';

// NOTE: this is a mix-in and probably won't be instantiated directly
export const WMoney = new Schema<IMoney>(
  {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: CURRENCY,
      required: true,
    },
  },
  { _id: false },
);
