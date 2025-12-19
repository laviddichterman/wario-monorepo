import { Global, Module } from '@nestjs/common';

import { DataProviderModule } from '../../data-provider/data-provider.module';

import { GoogleService } from './google.service';

/**
 * GoogleModule provides GoogleService with proper initialization order.
 *
 * Initialization Order (guaranteed by imports):
 * 1. DataProviderModule (DataProviderService.onModuleInit()) - settings loaded
 * 2. GoogleService.onModuleInit() - Google APIs initialized
 *
 * By importing DataProviderModule, NestJS guarantees DataProviderService.onModuleInit()
 * completes BEFORE GoogleService.onModuleInit() runs.
 */
@Global()
@Module({
  imports: [
    DataProviderModule, // MUST complete onModuleInit before GoogleService
  ],
  providers: [GoogleService],
  exports: [GoogleService],
})
export class GoogleModule { }
