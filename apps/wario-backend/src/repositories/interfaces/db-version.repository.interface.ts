import type { SEMVER } from '@wcp/wario-shared';

export const DB_VERSION_REPOSITORY = Symbol('DB_VERSION_REPOSITORY');

export interface IDBVersionRepository {
  get(): Promise<SEMVER | null>;
}
