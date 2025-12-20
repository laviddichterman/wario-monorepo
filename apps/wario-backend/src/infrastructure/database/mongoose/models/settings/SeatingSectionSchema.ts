import mongoose, { Schema } from 'mongoose';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

export const SeatingSectionSchema = new Schema<Omit<SeatingLayoutSection, 'id'>>(
  {
    name: { type: String, required: true },

    disabled: { type: Boolean, default: false },
    resources: { type: [String], default: [] },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingSectionModel = mongoose.model<SeatingLayoutSection>('SeatingSection', SeatingSectionSchema);
