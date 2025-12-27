import { useCallback, useMemo } from 'react';

import { Search as SearchIcon } from '@mui/icons-material';
import { Autocomplete, InputAdornment, TextField } from '@mui/material';

import {
  ComputeProductLevelVisibilityCheck,
  CreateWCPProduct,
  type ICatalogSelectors,
  ShowCurrentlyAvailableProducts,
  type WProduct,
} from '@wcp/wario-shared/logic';
import type { IProduct, IProductInstance, WProductMetadata } from '@wcp/wario-shared/types';
import { useCatalogQuery, useCatalogSelectors } from '@wcp/wario-ux-shared/query';

// =============================================================================
// Types
// =============================================================================

interface ProductSearchOption {
  instanceId: string;
  productId: string;
  label: string;
  categoryName: string;
  categoryId: string;
  productInstance: IProductInstance;
  product: IProduct;
  metadata: WProductMetadata;
}

export interface ProductSearchBarProps {
  /** Order's service date/time for availability filtering */
  serviceDateTime: Date | number;
  /** Order's fulfillment ID */
  fulfillmentId: string;
  /** Callback when a product needs customization */
  onOpenCustomizer: (product: WProduct, categoryId: string) => void;
  /** Callback when a product can be added directly */
  onAddDirect: (product: WProduct, categoryId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProductSearchBar({
  serviceDateTime,
  fulfillmentId,
  onOpenCustomizer,
  onAddDirect,
}: ProductSearchBarProps) {
  const { data: catalog } = useCatalogQuery();
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors | null;

  /**
   * Build searchable product options, filtering by:
   * - Available at the order's service date/time
   * - Not disabled for the fulfillment
   * - Not hidden from POS
   */
  const options = useMemo((): ProductSearchOption[] => {
    if (!catalog || !catalogSelectors) return [];

    const result: ProductSearchOption[] = [];

    // Get all product IDs and use selector for type-safe access
    const productIds = catalogSelectors.productEntries();

    for (const productId of productIds) {
      const product = catalogSelectors.productEntry(productId);
      if (!product) continue;

      // ComputeProductLevelVisibilityCheck returns visible product instances
      // It handles: product-level disable, fulfillment disable, instance hide flags, modifier availability
      const visibleInstances = ComputeProductLevelVisibilityCheck(
        catalogSelectors,
        product,
        fulfillmentId,
        serviceDateTime,
        'order', // Use order context for visibility checks
        ShowCurrentlyAvailableProducts, // Only show products available NOW (at service time)
      );

      for (const { productInstance, metadata } of visibleInstances) {
        // Skip if hidden from POS (additional check beyond order context)
        if (productInstance.displayFlags.pos.hide) continue;

        // Find category for this product instance
        let categoryName = 'Other';
        let categoryId = '';
        const categoryIds = catalogSelectors.categories();
        for (const catId of categoryIds) {
          const category = catalogSelectors.category(catId);
          if (category && (category.products.includes(productInstance.id) || category.products.includes(product.id))) {
            categoryName = category.name;
            categoryId = catId;
            break;
          }
        }

        // Use POS name if set, otherwise display name
        const posName = productInstance.displayFlags.pos.name;
        const label = posName || productInstance.displayName;

        result.push({
          instanceId: productInstance.id,
          productId: product.id,
          label,
          categoryName,
          categoryId,
          productInstance,
          product,
          metadata,
        });
      }
    }

    // Sort by category then label
    return result.sort((a, b) => {
      const catCompare = a.categoryName.localeCompare(b.categoryName);
      if (catCompare !== 0) return catCompare;
      return a.label.localeCompare(b.label);
    });
  }, [catalog, catalogSelectors, serviceDateTime, fulfillmentId]);

  const handleSelection = useCallback(
    (option: ProductSearchOption | null) => {
      if (!option || !catalogSelectors) return;

      const { productInstance, product, categoryId, metadata } = option;

      // Create WProduct with the pre-computed metadata
      const wcpProduct = CreateWCPProduct(product.id, productInstance.modifiers);
      const wProduct: WProduct = {
        p: wcpProduct,
        m: metadata,
      };

      // Determine if product needs customization:
      // - Product is incomplete (missing required modifiers)
      // - OR skip_customization is false AND product has selectable modifiers
      const skipCustomization = productInstance.displayFlags.order.skip_customization;
      const isIncomplete = metadata.incomplete;

      // Check for selectable modifiers
      const hasSelectableModifiers = Object.entries(metadata.modifier_map).some(([mtId, entry]) => {
        const modifierType = catalogSelectors.modifierEntry(mtId);
        return modifierType && entry.has_selectable;
      });

      if ((isIncomplete || !skipCustomization) && hasSelectableModifiers) {
        onOpenCustomizer(wProduct, categoryId);
      } else {
        onAddDirect(wProduct, categoryId);
      }
    },
    [catalogSelectors, onOpenCustomizer, onAddDirect],
  );

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.label}
      groupBy={(option) => option.categoryName}
      onChange={(_, value) => {
        handleSelection(value);
      }}
      value={null}
      blurOnSelect
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search products to add..."
          size="small"
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      sx={{ mb: 2 }}
    />
  );
}

export default ProductSearchBar;
