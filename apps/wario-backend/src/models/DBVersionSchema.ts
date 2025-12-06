import path from 'path';

import mongoose, { Schema } from 'mongoose';

import { type SEMVER } from '@wcp/wario-shared';

export const DBVersionSchema = new Schema<SEMVER>({
  major: Number,
  minor: Number,
  patch: Number,
});

export default mongoose.model<SEMVER>(path.basename(__filename).replace(path.extname(__filename), ''), DBVersionSchema);
