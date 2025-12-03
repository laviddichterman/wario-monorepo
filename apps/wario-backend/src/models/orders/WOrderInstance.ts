import path from 'path';

import mongoose, { Schema } from 'mongoose';

import {
  type OrderTax,
  type TipSelection,
  type WOrderInstance,
  WOrderStatus,
} from '@wcp/wario-shared';

import { WMoney } from '../../models/WMoney';
import { WOrderLineDiscountSchema } from '../payment/WOrderLineDiscount';
import { WOrderPaymentSchema } from '../payment/WOrderPayment';
import { KeyValueEntrySchema } from '../settings/KeyValueSchema';

import { CustomerInfoSchema } from './WCustomerInfo';
import { FulfillmentInfo } from './WFulfillmentInfo';
import { WMetricsSchema } from './WMetrics';
import { OrderCartEntrySchema } from './WOrderCartEntry';

export const OrderTaxSchema = new Schema<OrderTax>(
  {
    amount: {
      type: WMoney,
      required: true,
    },
  },
  { _id: false },
);

export const TipSelectionSchema = new Schema<TipSelection>(
  {
    isPercentage: Boolean,
    isSuggestion: Boolean,
    value: Schema.Types.Mixed,
  },
  { _id: false },
);

export const WOrderInstanceSchema = new Schema<Omit<WOrderInstance, 'id'>>(
  {
    status: {
      type: String,
      enum: WOrderStatus,
      required: true,
    },
    customerInfo: {
      type: CustomerInfoSchema,
      required: true,
    },
    fulfillment: {
      type: FulfillmentInfo,
      required: true,
    },
    cart: {
      type: [OrderCartEntrySchema],
      required: true,
    },
    discounts: {
      type: [WOrderLineDiscountSchema],
      required: true,
    },
    payments: {
      type: [WOrderPaymentSchema],
      required: true,
    },
    refunds: {
      type: [WOrderPaymentSchema],
      required: true,
    },
    metrics: WMetricsSchema,
    taxes: {
      type: [OrderTaxSchema],
      required: true,
    },
    tip: TipSelectionSchema,
    metadata: {
      type: [KeyValueEntrySchema],
      required: true,
    },
    specialInstructions: String,
    locked: String,
  },
  { id: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

export const WOrderInstanceModel = mongoose.model<WOrderInstance>(
  path.basename(__filename).replace(path.extname(__filename), ''),
  WOrderInstanceSchema,
);
