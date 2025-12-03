import { Schema } from 'mongoose';

import { type EncryptStringLock } from '@wcp/wario-shared';

export const WEncryptStringLockSchema = new Schema<EncryptStringLock>(
  {
    auth: {
      type: String,
      required: true,
    },
    enc: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);
