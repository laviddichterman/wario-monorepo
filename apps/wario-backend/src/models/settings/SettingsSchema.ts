import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { type IWSettings } from '@wcp/wario-shared';

export const SettingsSchema = new Schema<IWSettings>({
  config: {
    LOCATION_NAME: String,
    SQUARE_LOCATION: String,
    SQUARE_LOCATION_ALTERNATE: String,
    SQUARE_APPLICATION_ID: String,
    DEFAULT_FULFILLMENTID: String,
    TAX_RATE: Number,
    ALLOW_ADVANCED: Boolean,
    DELIVERY_LINK: String,
    DELIVERY_FEE: Number,
    AUTOGRAT_THRESHOLD: Number,
    MESSAGE_REQUEST_VEGAN: String,
    MESSAGE_REQUEST_HALF: String,
    MESSAGE_REQUEST_WELLDONE: String,
    MESSAGE_REQUEST_SLICING: String,
    TIP_PREAMBLE: String,
    LOCATION_PHONE_NUMBER: String,
  },
});

export const SettingsModel = mongoose.model<IWSettings>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  SettingsSchema,
);
