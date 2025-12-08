import type { IWSettings } from '@wcp/wario-shared';

export interface ISettingsRepository {
  get(): Promise<IWSettings | null>;
  save(settings: IWSettings): Promise<IWSettings>;
}

export const SETTINGS_REPOSITORY = Symbol('ISettingsRepository');
