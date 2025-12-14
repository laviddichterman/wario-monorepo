import type { CategoryVisibilityMap } from '@wcp/wario-shared/logic';

import { VisibilityMapContext } from '@/query/context/visibility-context-definition';

/**
 * Provider component that wraps children with access to a pre-computed visibility map.
 * Compute the map at the root level using useCategoryVisibilityMap, then pass it here.
 *
 * @example
 * ```tsx
 * const visibilityMap = useCategoryVisibilityMap(rootId, fulfillmentId, orderTime, 'menu', ShowTemporarilyDisabledProducts);
 * if (!visibilityMap) return <LoadingScreen />;
 * return (
 *   <VisibilityMapProvider value={visibilityMap}>
 *     <MyMenuTree categoryId={rootId} />
 *   </VisibilityMapProvider>
 * );
 * ```
 */
export function VisibilityMapProvider({
  value,
  children,
}: {
  value: CategoryVisibilityMap;
  children: React.ReactNode;
}) {
  return <VisibilityMapContext.Provider value={value}> {children} </VisibilityMapContext.Provider>;
}
