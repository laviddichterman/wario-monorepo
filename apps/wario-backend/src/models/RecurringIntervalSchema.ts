import { Schema } from 'mongoose';

import { type IRecurringInterval } from '@wcp/wario-shared';

import { IntervalSchema } from './IntervalSchema';

export const RecurringIntervalSchema = new Schema<IRecurringInterval>(
  {
    interval: IntervalSchema,
    rrule: String,
  },
  { _id: false },
);
