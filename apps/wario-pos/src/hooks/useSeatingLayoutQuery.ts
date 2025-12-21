/**
 * TanStack Query hooks for seating layout CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type { FullSeatingLayout, SeatingLayout, UpsertSeatingLayoutRequest } from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';
import { uuidv4 } from '@/utils/uuidv4';

import { useGetAuthToken } from './useGetAuthToken';

export const SEATING_LAYOUT_QUERY_KEY = ['seating-layout'] as const;

// Fetch functions
const fetchLayouts = async (token: string): Promise<SeatingLayout[]> => {
  const response = await axiosInstance.get<SeatingLayout[]>('/api/v1/config/seating-layout', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const fetchLayoutById = async (token: string, id: string): Promise<FullSeatingLayout> => {
  const response = await axiosInstance.get<FullSeatingLayout>(`/api/v1/config/seating-layout/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Hook to query all seating layouts
 */
export function useSeatingLayoutsQuery() {
  const { getToken } = useGetAuthToken();

  return useQuery({
    queryKey: SEATING_LAYOUT_QUERY_KEY,
    queryFn: async () => {
      const token = await getToken(AuthScopes.READ_SETTINGS);
      return fetchLayouts(token);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to query a single seating layout by ID
 */
export function useSeatingLayoutQuery(id: string | null) {
  const { getToken } = useGetAuthToken();

  return useQuery({
    queryKey: [...SEATING_LAYOUT_QUERY_KEY, id],
    queryFn: async () => {
      const token = await getToken(AuthScopes.READ_SETTINGS);
      return fetchLayoutById(token, id as string);
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Mutation hook for creating a seating layout
 */
export function useCreateSeatingLayoutMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (layout: UpsertSeatingLayoutRequest) => {
      const token = await getToken(AuthScopes.WRITE_SETTINGS);
      const response = await axiosInstance.post<FullSeatingLayout>('/api/v1/config/seating-layout', layout, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': uuidv4(),
        },
      });
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEATING_LAYOUT_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for updating a seating layout
 */
export function useUpdateSeatingLayoutMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, layout }: { id: string; layout: UpsertSeatingLayoutRequest }) => {
      const token = await getToken(AuthScopes.WRITE_SETTINGS);
      const response = await axiosInstance.patch<FullSeatingLayout>(`/api/v1/config/seating-layout/${id}`, layout, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': uuidv4(),
        },
      });
      return response.data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: SEATING_LAYOUT_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [...SEATING_LAYOUT_QUERY_KEY, variables.id] });
    },
  });
}

/**
 * Mutation hook for deleting a seating layout
 */
export function useDeleteSeatingLayoutMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken(AuthScopes.WRITE_SETTINGS);
      await axiosInstance.delete(`/api/v1/config/seating-layout/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SEATING_LAYOUT_QUERY_KEY });
    },
  });
}
