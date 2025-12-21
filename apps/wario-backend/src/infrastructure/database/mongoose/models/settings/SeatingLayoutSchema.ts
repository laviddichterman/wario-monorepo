import mongoose, { Schema } from 'mongoose';

import type { SeatingLayout } from '@wcp/wario-shared';

// SeatingLayout stores the layout metadata and references to floors
// Floors, sections, resources are stored in separate collections
export const SeatingLayoutSchema = new Schema<Omit<SeatingLayout, 'id'>>(
  {
    name: { type: String, required: true },
    floors: { type: [String], default: [] },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingLayoutModel = mongoose.model<SeatingLayout>('SeatingLayout', SeatingLayoutSchema);
