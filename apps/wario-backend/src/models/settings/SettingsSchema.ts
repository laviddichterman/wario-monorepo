import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { type IWSettings } from '@wcp/wario-shared';

export const SettingsSchema = new Schema<IWSettings>({
  LOCATION_NAME: { type: String, required: true },
  SQUARE_LOCATION: { type: String, required: true },
  SQUARE_LOCATION_ALTERNATE: { type: String, required: true },
  SQUARE_APPLICATION_ID: { type: String, required: true },
  DEFAULT_FULFILLMENTID: { type: String, required: true },
  TAX_RATE: { type: Number, required: true },
  ALLOW_ADVANCED: { type: Boolean, required: true },
  TIP_PREAMBLE: { type: String, required: true },
  LOCATION_PHONE_NUMBER: { type: String, required: true },
});

export const SettingsModel = mongoose.model<IWSettings>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  SettingsSchema,
);
