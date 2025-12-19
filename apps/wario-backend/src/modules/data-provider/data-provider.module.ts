import { Global, Module } from '@nestjs/common';

import { RepositoryModule } from '../../repositories/repository.module';
import { DatabaseManagerModule } from '../database-manager/database-manager.module';

import { DataProviderService } from './data-provider.service';

/**
 * DataProviderModule provides DataProviderService and ensures proper initialization order.
 *
 * Initialization Order:
 * 1. DatabaseManagerModule.onModuleInit() - DB migrations complete
 * 2. RepositoryModule - DB repos ready
 * 3. DataProviderService.onModuleInit() - settings loaded
 *
 * IMPORTANT: This module MUST complete initialization before IntegrationsModule.
 * IntegrationsModule imports this module to ensure SquareService and GoogleService
 * can safely access settings during their onModuleInit().
 */
@Global()
@Module({
  imports: [
    DatabaseManagerModule, // Ensures DB init complete first
    RepositoryModule, // Provides repository tokens
  ],
  providers: [DataProviderService],
  exports: [DataProviderService],
})
export class DataProviderModule { }
