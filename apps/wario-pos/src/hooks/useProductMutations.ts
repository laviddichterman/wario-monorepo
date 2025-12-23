import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type {
  CreateIProductInstanceRequest,
  CreateIProductRequest,
  IProduct,
  IProductInstance,
  IWInterval,
  UpdateIProductInstanceRequest,
  UpdateIProductRequest,
  UpsertIProductRequest,
} from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

interface SetProductDisabledRequest {
  id: string;
  disabled: IWInterval | null;
}

interface BatchDeleteProductsRequest {
  productIds: string[];
}

export type BatchUpsertProductResponse = {
  product: IProduct;
  instances: IProductInstance[];
}[];

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for adding a new product with its base instance
 */
export function useAddProductMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (req: CreateIProductRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const response = await axiosInstance.post<IProduct>('/api/v1/menu/product/', req, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for BATCH adding new products with a single base instance each
 */
export function useBatchUpsertProductMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (products: UpsertIProductRequest[]) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);

      // Backend expects { products: [...] } matching BatchUpsertProductRequest
      const response = await axiosInstance.post<BatchUpsertProductResponse>(
        '/api/v1/menu/product/batch/',
        { products },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    },
  });
}

/**
 * Mutation hook for editing a product
 */
export function useEditProductMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (props: UpdateIProductRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      // Body must include id - backend validates body.id === URL param
      const response = await axiosInstance.patch<IProduct>(`/api/v1/menu/product/${props.id}`, props, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for deleting a product
 */
export function useDeleteProductMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (productId: string) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

      const response = await axiosInstance.delete<IProduct>(`/api/v1/menu/product/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for enabling/disabling a product
 * Used for enable, disable, and disable_until_eod operations
 */
export function useSetProductDisabledMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ id, disabled }: SetProductDisabledRequest) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const response = await axiosInstance.patch<IProduct>(
        `/api/v1/menu/product/${id}`,
        { disabled },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    },
  });
}

/**
 * Mutation hook for batch deleting products
 * THIS SUCKS, make a batch delete endpoint
 */
export function useBatchDeleteProductsMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ productIds }: BatchDeleteProductsRequest) => {
      const token = await getToken(AuthScopes.DELETE_CATALOG);

      // Delete products sequentially to avoid overwhelming the server
      const results: IProduct[] = [];
      for (const productId of productIds) {
        const response = await axiosInstance.delete<IProduct>(`/api/v1/menu/product/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        results.push(response.data);
      }

      return results;
    },
  });
}

/**
 * Mutation hook for adding a new product instance
 */
export function useCreateProductInstanceMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ productId, body }: { productId: string; body: CreateIProductInstanceRequest }) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      const response = await axiosInstance.post<IProductInstance>(`/api/v1/menu/product/${productId}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}

/**
 * Mutation hook for updating a product instance
 */
export function useUpdateProductInstanceMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({
      productId,
      instanceId,
      body,
    }: {
      productId: string;
      instanceId: string;
      body: UpdateIProductInstanceRequest;
    }) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);

      const response = await axiosInstance.patch<IProductInstance>(
        `/api/v1/menu/product/${productId}/${instanceId}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    },
  });
}
