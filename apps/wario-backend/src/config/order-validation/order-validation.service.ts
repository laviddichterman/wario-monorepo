import { forwardRef, Inject, Injectable } from '@nestjs/common';

import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  CategorizedRebuiltCart,
  CoreCartEntry,
  RebuildAndSortCart,
  WCPProductV2Dto,
  WProduct,
} from '@wcp/wario-shared';

import { CatalogProviderService } from '../catalog-provider/catalog-provider.service';

/**
 * Service responsible for validating order components.
 * Handles cart rebuilding, product availability checks, and order state validation.
 */
@Injectable()
export class OrderValidationService {
  constructor(
    @Inject(forwardRef(() => CatalogProviderService))
    private catalogService: CatalogProviderService,
  ) { }

  /**
   * Rebuilds the order cart from catalog data and validates product availability.
   * @param cart - The cart entries to rebuild
   * @param service_time - The time of service
   * @param fulfillmentId - The fulfillment type ID
   * @returns Object containing any products no longer available and the rebuilt cart
   */
  RebuildOrderState = (
    cart: CoreCartEntry<WCPProductV2Dto>[],
    service_time: Date | number,
    fulfillmentId: string,
  ): {
    noLongerAvailable: CoreCartEntry<WProduct>[];
    rebuiltCart: CategorizedRebuiltCart;
  } => {
    const catalogSelectors = this.catalogService.CatalogSelectors;
    const rebuiltCart = RebuildAndSortCart(cart, catalogSelectors, service_time, fulfillmentId);
    // Check which products are no longer available at this time/fulfillment
    const noLongerAvailable: CoreCartEntry<WProduct>[] = Object.values(rebuiltCart).flatMap((entries) =>
      entries.filter(
        (x) =>
          !CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
            x.product.p.productId,
            x.product.p.modifiers,
            catalogSelectors,
            service_time,
            fulfillmentId,
            true,
          ) || !catalogSelectors.category(x.categoryId),
      ),
    );
    return {
      noLongerAvailable,
      rebuiltCart,
    };
  };
}
