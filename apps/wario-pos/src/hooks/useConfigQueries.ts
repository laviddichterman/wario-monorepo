import { useAuth0 } from '@auth0/auth0-react';
import { useQuery } from '@tanstack/react-query';

import axiosInstance from '@/utils/axios';

// ============================================================================
// Queries
// ============================================================================

/**
 * Query hook for fetching the Key Value Store
 */
export function useKeyValueStoreQuery() {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['kvstore'],
    queryFn: async () => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'read:settings' } });
      const response = await axiosInstance.get<Record<string, string>>('/api/v1/config/kvstore', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
