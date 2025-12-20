import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { type SeatingResource, SeatingShape } from '@wcp/wario-shared';

type MT = Omit<SeatingResource, 'id'>;
export const SeatingResourceSchema = new Schema<MT>(
  {
    name: { type: String, required: true },
    capacity: {
      type: Number,
      required: true,
    },
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

export const SeatingResourceModel = mongoose.model<SeatingResource>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  SeatingResourceSchema,
);
