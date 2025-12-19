import { Global, Module } from '@nestjs/common';

import { AppConfigurationModule } from 'src/config/app-configuration.module';
import { MigrationFlagsService } from 'src/config/migration-flags.service';

import { DataProviderModule } from '../../data-provider/data-provider.module';

import { SquareService } from './square.service';

/**
 * SquareModule provides SquareService with proper initialization order.
 *
 * Initialization Order (guaranteed by imports):
 * 1. DataProviderModule (DataProviderService.onModuleInit()) - settings loaded
 * 2. SquareService.onModuleInit() - Square client initialized
 *
 * By importing DataProviderModule, NestJS guarantees DataProviderService.onModuleInit()
 * completes BEFORE SquareService.onModuleInit() runs.
 */
@Global()
@Module({
  imports: [
    DataProviderModule, // MUST complete onModuleInit before SquareService
    AppConfigurationModule,
  ],
  providers: [MigrationFlagsService, SquareService],
  exports: [MigrationFlagsService, SquareService],
})
export class SquareModule {}
