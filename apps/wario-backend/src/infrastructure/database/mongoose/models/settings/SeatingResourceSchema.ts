import mongoose, { Schema } from 'mongoose';

import { type SeatingResource, SeatingShape } from '@wcp/wario-shared';

export const SeatingResourceSchema = new Schema<Omit<SeatingResource, 'id'>>(
  {
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    shape: { type: String, enum: SeatingShape, required: true },
    sectionId: { type: String, required: true },
    shapeDimX: { type: Number, required: true },
    shapeDimY: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingResourceModel = mongoose.model<SeatingResource>('SeatingResource', SeatingResourceSchema);
