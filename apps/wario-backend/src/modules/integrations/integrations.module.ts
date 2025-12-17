import { Global, Module } from '@nestjs/common';

import { AppConfigurationModule } from 'src/config/app-configuration.module';
import { DataProviderService } from 'src/config/data-provider/data-provider.service';
import { MigrationFlagsService } from 'src/config/migration-flags.service';

import { RepositoryModule } from '../../repositories/repository.module';
import { DatabaseManagerModule } from '../database-manager/database-manager.module';

import { GoogleService } from './google/google.service';
import { SquareService } from './square/square.service';

/**
 * IntegrationsModule encapsulates third-party service integrations.
 *
 * Initialization Order:
 * 1. DatabaseManagerModule.onModuleInit() - migrations complete
 * 2. RepositoryModule - DB repos ready
 * 3. DataProviderService.onModuleInit() - settings loaded (if in this module)
 * 4. SquareService.onModuleInit() - Square client initialized
 * 5. GoogleService.onModuleInit() - Google APIs initialized
 *
 * Services that depend on Square/Google should import this module.
 */
@Global()
@Module({
  imports: [
    DatabaseManagerModule, // Ensures DB init complete before Square/Google
    RepositoryModule, // Provides repository tokens for DataProviderService
    AppConfigurationModule,
  ],
  providers: [
    MigrationFlagsService,
    DataProviderService, // Required by both Square and Google
    SquareService,
    GoogleService,
  ],
  exports: [MigrationFlagsService, DataProviderService, SquareService, GoogleService],
})
export class IntegrationsModule {}
