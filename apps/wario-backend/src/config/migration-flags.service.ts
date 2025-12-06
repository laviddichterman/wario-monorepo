import { Injectable } from '@nestjs/common';

import { AppConfigService } from './app-config.service';

/**
 * Simple service to hold migration-related flags that need to be shared between services.
 * This decouples DatabaseManagerService from SquareService and CatalogProviderService,
 * avoiding circular dependency issues during initialization.
 */
@Injectable()
export class MigrationFlagsService {
  private _requireSquareRebuild: boolean;
  private _obliterateModifiersOnLoad = false;

  constructor(private appConfig: AppConfigService) {
    // Initialize from AppConfigService (which reads the environment variable)
    this._requireSquareRebuild = appConfig.forceSquareCatalogRebuildOnLoad;
  }

  get requireSquareRebuild(): boolean {
    return this._requireSquareRebuild;
  }

  set requireSquareRebuild(value: boolean) {
    this._requireSquareRebuild = value;
  }

  get obliterateModifiersOnLoad(): boolean {
    return this._obliterateModifiersOnLoad;
  }

  set obliterateModifiersOnLoad(value: boolean) {
    this._obliterateModifiersOnLoad = value;
  }
}
