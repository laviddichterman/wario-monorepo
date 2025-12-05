import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { SquareService } from '../square/square.service';

import { CatalogProviderService } from './catalog-provider.service';

@Injectable()
export class CatalogSquareSyncService {
  private readonly logger = new Logger(CatalogSquareSyncService.name);

  constructor(
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogProvider: CatalogProviderService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
  ) { }
}
