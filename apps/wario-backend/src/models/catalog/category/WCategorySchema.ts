import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { CALL_LINE_DISPLAY, CategoryDisplay, type ICategory } from '@wcp/wario-shared';

type MT = Omit<ICategory, 'id'>;
export const WCategorySchema = new Schema<MT>(
  {
    // brief name of the category
    name: { type: String, required: true },

    // longer, optional description of the category,
    // used instead of the name if present. HTML allowed.
    description: String,

    // subheading, optional, HTML allowed
    subheading: String,

    // footnotes (like for health dept warnings), optional, HTML allowed
    footnotes: String,

    display_flags: {
      call_line_name: String,
      call_line_display: {
        type: String,
        enum: CALL_LINE_DISPLAY,
        required: true,
      },
      nesting: {
        type: String,
        enum: CategoryDisplay,
        required: true,
      },
    },
    serviceDisable: [{ type: String, ref: 'FulfillmentSchema' }],

    // ordered list of child category IDs
    children: [{ type: String, ref: 'WCategorySchema' }],

    // ordered list of product IDs appearing in this category
    products: [{ type: String, ref: 'WProductSchema' }],
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const WCategoryModel = mongoose.model<ICategory>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  WCategorySchema,
);
