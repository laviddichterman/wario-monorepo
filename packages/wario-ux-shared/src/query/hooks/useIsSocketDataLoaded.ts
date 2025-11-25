/**
 * Utility hook to check if all socket data is loaded
 * Equivalent to Redux IsSocketDataLoaded selector
 */

import { useCatalogQuery } from './useCatalogQuery';
import { useFulfillmentsQuery } from './useFulfillmentsQuery';
import { useServerTimeQuery } from './useServerTimeQuery';
import { useSettingsQuery } from './useSettingsQuery';

/**
 * Hook to check if all required socket data has been loaded
 * @returns true if catalog, fulfillments, settings, and server time are all loaded
 */
export function useIsSocketDataLoaded(): boolean {
  const { data: catalog } = useCatalogQuery();
  const { data: fulfillments } = useFulfillmentsQuery();
  const { data: settings } = useSettingsQuery();
  const { data: serverTime } = useServerTimeQuery();

  return (
    catalog !== null &&
    fulfillments !== null &&
    settings !== null &&
    serverTime !== null
  );
}
