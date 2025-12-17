import { Schema } from 'mongoose';

import {
  type IOptionInstance,
  OptionPlacement,
  OptionQualifier,
  type ProductInstanceModifierEntry,
} from '@wcp/wario-shared';

export const WOptionInstanceSchema = new Schema<IOptionInstance>(
  {
    optionId: {
      type: String,
      required: true,
    },

    placement: {
      type: Number,
      enum: OptionPlacement,
      required: true,
    },

    qualifier: {
      type: Number,
      enum: OptionQualifier,
      required: true,
    },
  },
  { _id: false },
);

export const ProductModifierSchema = new Schema<ProductInstanceModifierEntry>(
  {
    modifierTypeId: {
      type: String,
      ref: 'WOptionTypeSchema',
      required: true,
    },
    options: {
      type: [WOptionInstanceSchema],
      required: true,
    },
  },
  { _id: false },
);
