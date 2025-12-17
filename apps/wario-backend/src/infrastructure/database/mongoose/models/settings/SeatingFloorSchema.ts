import mongoose, { Schema } from 'mongoose';

import type { SeatingFloor } from '@wcp/wario-shared';

export const SeatingFloorSchema = new Schema<Omit<SeatingFloor, 'id'>>(
  {
    name: { type: String, required: true },
    ordinal: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingFloorModel = mongoose.model<SeatingFloor>('SeatingFloor', SeatingFloorSchema);
