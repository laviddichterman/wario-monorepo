import { Global, Module } from '@nestjs/common';

import { DataProviderModule } from '../data-provider/data-provider.module';

import { GoogleModule } from './google/google.module';
import { SquareModule } from './square/square.module';

/**
 * IntegrationsModule is a facade that re-exports Square and Google modules.
 *
 * Initialization Order (guaranteed by NestJS module imports):
 * 1. DataProviderModule (DataProviderService.onModuleInit()) - settings loaded
 * 2. SquareModule (SquareService.onModuleInit()) - Square client initialized
 * 3. GoogleModule (GoogleService.onModuleInit()) - Google APIs initialized
 *
 * Each sub-module (SquareModule, GoogleModule) imports DataProviderModule,
 * which guarantees DataProviderService.onModuleInit() completes BEFORE
 * their respective service onModuleInit() hooks run.
 */
@Global()
@Module({
  imports: [
    DataProviderModule, // Re-export for convenience
    SquareModule,
    GoogleModule,
  ],
  exports: [DataProviderModule, SquareModule, GoogleModule],
})
export class IntegrationsModule { }
