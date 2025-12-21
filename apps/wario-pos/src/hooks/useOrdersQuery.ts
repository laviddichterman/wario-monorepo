import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { AuthScopes } from '@wcp/wario-shared-private';
import {
  CreateProductWithMetadataFromV2,
  EventTitleStringBuilder,
  GenerateCategoryOrderList,
  GenerateCategoryOrderMap,
  GroupAndOrderCart,
  RebuildAndSortCart,
  WDateUtils,
  WOrderStatus,
} from '@wcp/wario-shared/logic';
import { type CoreCartEntry, type WOrderInstance } from '@wcp/wario-shared/types';
import {
  useCatalogSelectors,
  useCurrentTime,
  useFulfillmentById,
  useValueFromFulfillmentById,
} from '@wcp/wario-ux-shared/query';

import axiosInstance from '@/utils/axios';
import { uuidv4 } from '@/utils/uuidv4';

import { toast } from '@/components/snackbar';

import { useGetAuthToken } from './useGetAuthToken';

// Fetch orders function
const fetchOrders = async (
  token: string,
  date: string | null,
  endDate: string | null,
  status: WOrderStatus | null,
): Promise<Record<string, WOrderInstance>> => {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  if (endDate) params.endDate = endDate;
  if (status) params.status = status;

  const response = await axiosInstance.get<WOrderInstance[]>('/api/v1/order', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  // Convert array to record for frontend compatibility
  return response.data.reduce((acc, order) => ({ ...acc, [order.id]: order }), {});
};

export type OrderQueryOptions = {
  date?: string | null;
  endDate?: string | null;
  status?: WOrderStatus | null;
};

// Hook to get orders
// Requires at least one constraint (date, endDate, or status) to prevent unbounded queries
export function useOrdersQuery(options: OrderQueryOptions | null = null) {
  const { getToken } = useGetAuthToken();

  const date = options?.date ?? null;
  const endDate = options?.endDate ?? null;
  const status = options?.status ?? null;

  // Require at least one constraint to prevent fetching all orders
  const hasConstraints = date !== null || endDate !== null || status !== null;

  return useQuery({
    queryKey: ['orders', date, endDate, status],
    queryFn: async () => {
      const token = await getToken(AuthScopes.READ_ORDER);
      return fetchOrders(token, date, endDate, status);
    },
    // Disable query if no constraints provided - prevents unbounded queries
    enabled: hasConstraints,
  });
}

export function usePendingOrdersQuery() {
  const { getToken } = useGetAuthToken();
  const currentDate = useCurrentTime();
  const currentDateStr = WDateUtils.formatISODate(currentDate);
  return useQuery({
    queryKey: ['orders', 'pending', currentDateStr],
    queryFn: async () => {
      const token = await getToken(AuthScopes.READ_ORDER);
      return fetchOrders(token, currentDateStr, null, WOrderStatus.OPEN);
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });
}

// Fetch a single order by ID
const fetchOrderById = async (token: string, orderId: string): Promise<WOrderInstance> => {
  const response = await axiosInstance.get<{ success: boolean; result: WOrderInstance }>(`/api/v1/order/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.result;
};

// Hook to get a single order by ID using dedicated API endpoint
export function useOrderById(orderId: string | null): WOrderInstance | null {
  const { getToken } = useGetAuthToken();

  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      // orderId is guaranteed non-null when queryFn runs due to enabled check
      const token = await getToken(AuthScopes.READ_ORDER);
      return fetchOrderById(token, orderId as string);
    },
    enabled: orderId !== null,
  });

  return data ?? null;
}

// Mutation hooks
export function useConfirmOrderMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ orderId, additionalMessage }: { orderId: string; additionalMessage?: string }) => {
      const token = await getToken(AuthScopes.WRITE_ORDER);
      await axiosInstance.put(
        `/api/v1/order/${orderId}/confirm`,
        { additionalMessage },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Order confirmed successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to confirm order');
      console.error(error);
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
      emailCustomer,
    }: {
      orderId: string;
      reason: string;
      emailCustomer?: boolean;
    }) => {
      const token = await getToken(AuthScopes.CANCEL_ORDER);
      await axiosInstance.put(
        `/api/v1/order/${orderId}/cancel`,
        { reason, emailCustomer },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Order canceled successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to cancel order');
      console.error(error);
    },
  });
}

export function useRescheduleOrderMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ orderId, newDate, newTime }: { orderId: string; newDate: string; newTime: number }) => {
      const token = await getToken(AuthScopes.WRITE_ORDER);
      await axiosInstance.put(
        `/api/v1/order/${orderId}/reschedule`,
        { newDate, newTime },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Order rescheduled successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to reschedule order');
      console.error(error);
    },
  });
}

export function useMoveOrderMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({
      orderId,
      destination,
      additionalMessage,
    }: {
      orderId: string;
      destination: string;
      additionalMessage: string;
    }) => {
      const token = await getToken(AuthScopes.WRITE_ORDER);
      await axiosInstance.put(
        `/api/v1/order/${orderId}/move`,
        { destination, additionalMessage },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Order moved successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to move order');
      console.error(error);
    },
  });
}

export function useForceSendOrderMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const token = await getToken(AuthScopes.SEND_ORDER);
      await axiosInstance.put(
        `/api/v1/order/${orderId}/send`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': uuidv4(),
          },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Order sent successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to send order');
      console.error(error);
    },
  });
}

export function useUnlockOrdersMutation() {
  const queryClient = useQueryClient();
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken(AuthScopes.WRITE_ORDER);
      await axiosInstance.put(
        '/api/v1/order/unlock',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: async () => {
      toast.success('Orders unlocked successfully');
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      toast.error('Failed to unlock orders');
      console.error(error);
    },
  });
}

export function useGroupedAndSortedCart(order: WOrderInstance | null) {
  const catalogSelectors = useCatalogSelectors();
  return useMemo(() => {
    if (!order || !catalogSelectors) {
      return [];
    }
    const serviceTime = WDateUtils.ComputeServiceDateTime(order.fulfillment);
    const coreCart = (order.cart as CoreCartEntry[]).map((x) => ({
      ...x,
      product: CreateProductWithMetadataFromV2(
        x.product,
        catalogSelectors,
        serviceTime,
        order.fulfillment.selectedService,
      ),
    }));
    // Generate the categoryIdOrdinalMap for a default category (using first entry's categoryId or empty)
    const firstCategoryId = coreCart.length > 0 ? coreCart[0].categoryId : '';
    const categoryOrderMap = GenerateCategoryOrderMap(firstCategoryId, catalogSelectors.category);
    return GroupAndOrderCart(coreCart, categoryOrderMap);
  }, [order, catalogSelectors]);
}

const useCategoryOrderMapForFullfillment = (fulfillmentId: string) => {
  const catalogSelectors = useCatalogSelectors();
  const fulfillmentMainCategory = useValueFromFulfillmentById(fulfillmentId, 'orderBaseCategoryId');
  const fulfillmentSecondaryCategory = useValueFromFulfillmentById(fulfillmentId, 'orderSupplementaryCategoryId');

  return useMemo(() => {
    if (!catalogSelectors || !fulfillmentMainCategory) {
      return {};
    }
    const categoryOrderArrayMain = GenerateCategoryOrderList(fulfillmentMainCategory, catalogSelectors.category);
    const categoryOrderArraySecondary = fulfillmentSecondaryCategory
      ? GenerateCategoryOrderList(fulfillmentSecondaryCategory, catalogSelectors.category)
      : [];
    const categoryOrderMap = Object.fromEntries(
      [...categoryOrderArrayMain, ...categoryOrderArraySecondary].map((x, i) => [x, i]),
    );

    return categoryOrderMap;
  }, [catalogSelectors, fulfillmentMainCategory, fulfillmentSecondaryCategory]);
};

export function useEventTitleStringForOrder(order: WOrderInstance | null) {
  const catalogSelectors = useCatalogSelectors();
  const fulfillment = useFulfillmentById(order?.fulfillment.selectedService || null);
  const orderMap = useCategoryOrderMapForFullfillment(order?.fulfillment.selectedService || '');
  return useMemo(() => {
    if (catalogSelectors && order && fulfillment) {
      const serviceTime = WDateUtils.ComputeServiceDateTime(order.fulfillment);
      const cart = RebuildAndSortCart(order.cart, catalogSelectors, serviceTime, order.fulfillment.selectedService);
      return EventTitleStringBuilder(
        catalogSelectors,
        orderMap,
        fulfillment,
        `${order.customerInfo.givenName} ${order.customerInfo.familyName}`,
        order.fulfillment,
        cart,
        order.specialInstructions ?? '',
      );
    }
    return '';
  }, [catalogSelectors, order, fulfillment, orderMap]);
}
