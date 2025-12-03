import { Schema } from 'mongoose';

import { type IWInterval } from '@wcp/wario-shared';

export const IntervalSchema = new Schema<IWInterval>(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  { _id: false },
);
