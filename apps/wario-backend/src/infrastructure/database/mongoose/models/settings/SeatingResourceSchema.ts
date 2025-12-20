import mongoose, { Schema } from 'mongoose';

import { type SeatingResource, SeatingShape } from '@wcp/wario-shared';

export const SeatingResourceSchema = new Schema<Omit<SeatingResource, 'id'>>(
  {
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    shape: { type: String, enum: SeatingShape, required: true },
    shapeDimX: { type: Number, required: true },
    shapeDimY: { type: Number, required: true },
    centerX: { type: Number, required: true, default: 0 },
    centerY: { type: Number, required: true, default: 0 },
    rotation: { type: Number, required: true, default: 0 },
    disabled: { type: Boolean, default: false },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingResourceModel = mongoose.model<SeatingResource>('SeatingResource', SeatingResourceSchema);
