import { useQuery } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';

import axiosInstance from '@/utils/axios';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Queries
// ============================================================================

/**
 * Query hook for fetching the Key Value Store
 */
export function useKeyValueStoreQuery() {
  const { getToken } = useGetAuthToken();

  return useQuery({
    queryKey: ['kvstore'],
    queryFn: async () => {
      const token = await getToken(AuthScopes.READ_SETTINGS);
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
