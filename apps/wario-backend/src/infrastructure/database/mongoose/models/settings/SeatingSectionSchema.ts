import mongoose, { Schema } from 'mongoose';

import type { SeatingLayoutSection } from '@wcp/wario-shared';

export const SeatingSectionSchema = new Schema<Omit<SeatingLayoutSection, 'id'>>(
  {
    name: { type: String, required: true },
    floorId: { type: String, required: true },
    ordinal: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingSectionModel = mongoose.model<SeatingLayoutSection>('SeatingSection', SeatingSectionSchema);
