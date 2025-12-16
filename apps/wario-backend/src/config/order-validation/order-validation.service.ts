import { Injectable } from '@nestjs/common';

import {
  CanThisBeOrderedAtThisTimeAndFulfillmentCatalog,
  CategorizedRebuiltCart,
  CoreCartEntry,
  FulfillmentConfig,
  GenerateProductsReachableAndNotDisabledFromFulfillment,
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
  constructor(private catalogProviderService: CatalogProviderService) {}

  /**
   * Rebuilds the order cart from catalog data and validates product availability.
   * @param cart - The cart entries to rebuild
   * @param service_time - The time of service
   * @param fulfillment - The fulfillment config
   * @returns Object containing any products no longer available and the rebuilt cart
   */
  RebuildOrderState = (
    cart: CoreCartEntry<WCPProductV2Dto>[],
    service_time: Date | number,
    fulfillment: FulfillmentConfig,
  ): {
    noLongerAvailable: CoreCartEntry<WProduct>[];
    rebuiltCart: CategorizedRebuiltCart;
  } => {
    const catalogSelectors = this.catalogProviderService.getCatalogSelectors();
    const reachableProducts = GenerateProductsReachableAndNotDisabledFromFulfillment(fulfillment, catalogSelectors);
    const rebuiltCart = RebuildAndSortCart(cart, catalogSelectors, service_time, fulfillment.id);
    // Check which products are no longer available at this time/fulfillment
    const noLongerAvailable: CoreCartEntry<WProduct>[] = Object.values(rebuiltCart).flatMap((entries) =>
      entries.filter(
        (x) =>
          !CanThisBeOrderedAtThisTimeAndFulfillmentCatalog(
            x.product.p.productId,
            x.product.p.modifiers,
            catalogSelectors,
            service_time,
            reachableProducts,
            fulfillment.id,
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
