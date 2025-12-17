import mongoose, { Schema } from 'mongoose';

import type { SeatingPlacement } from '@wcp/wario-shared';

export const SeatingPlacementSchema = new Schema<Omit<SeatingPlacement, 'id'>>(
  {
    name: { type: String, required: true },
    sectionId: { type: String, required: true },
    centerX: { type: Number, required: true },
    centerY: { type: Number, required: true },
    rotation: { type: Number, required: true },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingPlacementModel = mongoose.model<SeatingPlacement>('SeatingPlacement', SeatingPlacementSchema);
