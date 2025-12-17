import path from 'path';

import { type GeoJSON } from 'geojson';
import mongoose, { Schema } from 'mongoose';

export const DeliveryAreaSchema = new Schema<GeoJSON.Polygon>(
  {
    type: {
      type: String,
      enum: ['Polygon'],
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of arrays of numbers
    },
  },
  { id: true, toJSON: { virtuals: true } },
);

export const DeliveryAreaModel = mongoose.model<GeoJSON.Polygon>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  DeliveryAreaSchema,
);
