import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (req: CreateIProductRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (products: UpsertIProductRequest[]) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (props: UpdateIProductRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      // Destructure id from props - it goes in URL, not body
      const { id, ...updateFields } = props;
      const response = await axiosInstance.patch<IProduct>(`/api/v1/menu/product/${id}`, updateFields, {
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async (productId: string) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, disabled }: SetProductDisabledRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ productIds }: BatchDeleteProductsRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });

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
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ productId, body }: { productId: string; body: CreateIProductInstanceRequest }) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
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
  const { getAccessTokenSilently } = useAuth0();

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
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

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
