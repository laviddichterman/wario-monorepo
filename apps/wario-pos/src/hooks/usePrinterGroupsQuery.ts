import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PrinterGroup } from '@wcp/wario-shared';

import axiosInstance from '@/utils/axios';

/**
 * Query key for printer groups
 */
export const PRINTER_GROUPS_QUERY_KEY = ['printerGroups'] as const;

/**
 * Fetches printer groups from the API
 */
async function fetchPrinterGroups(token: string): Promise<PrinterGroup[]> {
  const response = await axiosInstance.get<PrinterGroup[]>('/api/v1/menu/printergroup', {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

/**
 * Hook to query printer groups from the API
 * Returns printer groups as an array
 */
export function usePrinterGroupsQuery() {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: PRINTER_GROUPS_QUERY_KEY,
    queryFn: async () => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
      return fetchPrinterGroups(token);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook that returns printer groups as a Record keyed by ID
 * Convenient for lookups
 */
export function usePrinterGroupsMap() {
  const query = usePrinterGroupsQuery();

  const printerGroupsMap = query.data?.reduce((acc, pg) => {
    acc[pg.id] = pg;
    return acc;
  }, {} as Record<string, PrinterGroup>);

  return {
    ...query,
    data: printerGroupsMap ?? {},
  };
}

// ============================================================================
// Mutations
// ============================================================================

interface AddPrinterGroupRequest {
  name: string;
  singleItemPerTicket: boolean;
  isExpo: boolean;
}

interface EditPrinterGroupRequest {
  id: string;
  name: string;
  singleItemPerTicket: boolean;
  isExpo: boolean;
}

interface DeletePrinterGroupRequest {
  id: string;
  reassign: boolean;
  printerGroup: string | null;
}

/**
 * Mutation hook for adding a printer group
 */
export function useAddPrinterGroupMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (data: AddPrinterGroupRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order write:catalog' } });

      const response = await axiosInstance.post<PrinterGroup>('/api/v1/menu/printergroup', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch printer groups
      void queryClient.invalidateQueries({ queryKey: PRINTER_GROUPS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for editing a printer group
 */
export function useEditPrinterGroupMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (data: EditPrinterGroupRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order write:catalog' } });

      const response = await axiosInstance.patch<PrinterGroup>(
        `/api/v1/menu/printergroup/${data.id}`,
        { name: data.name, singleItemPerTicket: data.singleItemPerTicket, isExpo: data.isExpo },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch printer groups
      void queryClient.invalidateQueries({ queryKey: PRINTER_GROUPS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for deleting a printer group
 */
export function useDeletePrinterGroupMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (data: DeletePrinterGroupRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

      const response = await axiosInstance.delete<PrinterGroup>(`/api/v1/menu/printergroup/${data.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: {
          reassign: data.reassign,
          printerGroup: data.printerGroup,
        },
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch printer groups
      void queryClient.invalidateQueries({ queryKey: PRINTER_GROUPS_QUERY_KEY });
    },
  });
}
