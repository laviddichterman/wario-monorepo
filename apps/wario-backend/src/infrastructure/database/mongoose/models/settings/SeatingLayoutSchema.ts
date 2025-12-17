import mongoose, { Schema } from 'mongoose';

import type { SeatingLayout } from '@wcp/wario-shared';

// SeatingLayout only stores id and name in the entity
// floors, sections, resources, and placements are stored in separate tables
export const SeatingLayoutSchema = new Schema<Pick<SeatingLayout, 'name'>>(
  {
    name: { type: String, required: true },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const SeatingLayoutModel = mongoose.model<SeatingLayout>('SeatingLayout', SeatingLayoutSchema);
