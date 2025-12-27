/**
 * CustomizerContext - React context for sharing product customization state.
 *
 * This context provides read-only access to the product being customized and
 * catalog/ordering data. Derived state (option states, visibility) and mutation
 * callbacks are handled by the components themselves.
 *
 * Usage:
 * ```tsx
 * <CustomizerProvider
 *   product={product}
 *   catalogSelectors={catalogSelectors}
 *   productType={productType}
 *   fulfillmentId={fulfillmentId}
 *   serviceDateTime={serviceDateTime}
 * >
 *   <CustomerModifierTypeEditor
 *     mtid={mtid}
 *     onSelectRadio={selectRadio}
 *     onToggleCheckbox={toggleCheckbox}
 *   />
 * </CustomizerProvider>
 * ```
 */

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { ICatalogSelectors, IProduct, WProduct } from '@wcp/wario-shared/types';

// =============================================================================
// Types
// =============================================================================

export interface CustomizerContextValue {
  /** The product being customized */
  product: WProduct;
  /** Catalog selectors for option lookups */
  catalogSelectors: ICatalogSelectors;
  /** The product type definition */
  productType: IProduct;
  /** Order fulfillment ID for visibility filtering */
  fulfillmentId: string;
  /** Order service date/time for availability */
  serviceDateTime: Date | number;
}

export interface CustomizerProviderProps extends CustomizerContextValue {
  /** Children to render */
  children: ReactNode;
}

// =============================================================================
// Context
// =============================================================================

const CustomizerContext = createContext<CustomizerContextValue | null>(null);

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the customizer context.
 * Must be used within a CustomizerProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCustomizerContext(): CustomizerContextValue {
  const context = useContext(CustomizerContext);
  if (!context) {
    throw new Error('useCustomizerContext must be used within a CustomizerProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not within a provider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCustomizerContextOptional(): CustomizerContextValue | null {
  return useContext(CustomizerContext);
}

// =============================================================================
// Provider
// =============================================================================

export function CustomizerProvider({
  product,
  catalogSelectors,
  productType,
  fulfillmentId,
  serviceDateTime,
  children,
}: CustomizerProviderProps) {
  const contextValue = useMemo<CustomizerContextValue>(
    () => ({
      product,
      catalogSelectors,
      productType,
      fulfillmentId,
      serviceDateTime,
    }),
    [product, catalogSelectors, productType, fulfillmentId, serviceDateTime],
  );

  return <CustomizerContext.Provider value={contextValue}>{children}</CustomizerContext.Provider>;
}
