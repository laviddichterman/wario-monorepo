import { Global, Module } from '@nestjs/common';

import { RepositoryModule } from '../../repositories/repository.module';
import { IntegrationsModule } from '../integrations/integrations.module';

import { CatalogProviderService } from './catalog-provider.service';

/**
 * CatalogProviderModule encapsulates the catalog loading and management.
 *
 * Initialization Order (enforced by module imports):
 * 1. DatabaseManagerModule - migrations complete
 * 2. RepositoryModule - repos ready (imports DatabaseManagerModule)
 * 3. IntegrationsModule - Square/Google initialized
 * 4. CatalogProviderModule - catalog loaded from DB, synced with Square
 *
 * This module must be imported AFTER IntegrationsModule and RepositoryModule.
 */
@Global()
@Module({
  imports: [
    IntegrationsModule, // Square + Google + DataProvider must init first
    RepositoryModule, // All repos for catalog data
  ],
  providers: [CatalogProviderService],
  exports: [CatalogProviderService],
})
export class CatalogProviderModule {}
