import { useAuth0 } from '@auth0/auth0-react';
import { useMutation } from '@tanstack/react-query';

import type {
  CreateProductBatchRequest,
  IProduct,
  IProductInstance,
  IWInterval,
  UncommittedIProduct,
  UncommittedIProductInstance,
  UpsertProductBatchRequest,
} from '@wcp/wario-shared';

import axiosInstance from '@/utils/axios';

import { type ProductFormState, toProductApiBody } from '@/atoms/forms/productFormAtoms';
import { type ProductInstanceFormState, toProductInstanceApiBody } from '@/atoms/forms/productInstanceFormAtoms';

// ============================================================================
// Types
// ============================================================================

interface AddProductRequest {
  productForm: ProductFormState;
  instanceForm: ProductInstanceFormState;
}


interface EditProductRequest {
  id: string;
  form: ProductFormState;
}

interface SetProductDisabledRequest {
  product: IProduct;
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
    mutationFn: async ({ productForm, instanceForm }: AddProductRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

      const productBody: UncommittedIProduct = toProductApiBody(productForm);
      const instanceBody: UncommittedIProductInstance = toProductInstanceApiBody(instanceForm);

      const body: CreateProductBatchRequest = {
        instances: [instanceBody],
        product: productBody,
      };

      const response = await axiosInstance.post<IProduct>('/api/v1/menu/product/', body, {
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
    mutationFn: async (products: UpsertProductBatchRequest[]) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });

      const response = await axiosInstance.post<BatchUpsertProductResponse>('/api/v1/menu/productbatch/', products, {
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
 * Mutation hook for editing a product
 */
export function useEditProductMutation() {
  const { getAccessTokenSilently } = useAuth0();

  return useMutation({
    mutationFn: async ({ id, form }: EditProductRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body = toProductApiBody(form);

      const response = await axiosInstance.patch<IProduct>(`/api/v1/menu/product/${id}`, body, {
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
    mutationFn: async ({ product, disabled }: SetProductDisabledRequest) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:catalog' } });
      const body: IProduct = {
        ...product,
        disabled,
      };

      const response = await axiosInstance.patch<IProduct>(`/api/v1/menu/product/${product.id}`, body, {
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
