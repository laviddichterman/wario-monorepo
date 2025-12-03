import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { type IProductInstanceFunction } from '@wcp/wario-shared';

import { WAbstractExpressionSchema } from './WAbstractExpression';
type MT = Omit<IProductInstanceFunction, 'id'>;
export const WProductInstanceFunction = new Schema<MT>(
  {
    expression: WAbstractExpressionSchema,
    name: { type: String, required: true },
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const WProductInstanceFunctionModel =
  mongoose.model<IProductInstanceFunction>(
    path.basename(__filename).replace(path.extname(__filename), ''),
    WProductInstanceFunction,
  );
