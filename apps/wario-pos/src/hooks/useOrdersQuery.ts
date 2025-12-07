import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useMemo } from 'react';

import {
  type CoreCartEntry,
  CreateProductWithMetadataFromV2,
  EventTitleStringBuilder,
  GroupAndOrderCart,
  RebuildAndSortCart,
  WDateUtils,
  type WOrderInstance,
} from '@wcp/wario-shared';
import { useCatalogSelectors, useFulfillmentById } from '@wcp/wario-ux-shared/query';

import axiosInstance from '@/utils/axios';
import { uuidv4 } from '@/utils/uuidv4';

// Fetch orders function
const fetchOrders = async (token: string, date: string | null): Promise<Record<string, WOrderInstance>> => {
  const params = date ? { date } : {};
  const response = await axiosInstance.get<Record<string, WOrderInstance>>('/api/v1/order', {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data;
};

// Hook to get orders
export function useOrdersQuery(date: string | null = null) {
  const { getAccessTokenSilently } = useAuth0();

  return useQuery({
    queryKey: ['orders', date],
    queryFn: async () => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'read:order' } });
      return fetchOrders(token, date);
    },
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: true,
  });
}

// Hook to get a single order by ID
export function useOrderById(orderId: string) {
  const { data: orders } = useOrdersQuery(null); // Assuming null fetches relevant orders (e.g. today)
  return orders ? orders[orderId] : null;
}

// Mutation hooks
export function useConfirmOrderMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ orderId, additionalMessage }: { orderId: string; additionalMessage?: string }) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
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
      enqueueSnackbar('Order confirmed successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to confirm order', { variant: 'error' });
      console.error(error);
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

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
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
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
      enqueueSnackbar('Order canceled successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to cancel order', { variant: 'error' });
      console.error(error);
    },
  });
}

export function useRescheduleOrderMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ orderId, newDate, newTime }: { orderId: string; newDate: string; newTime: number }) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
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
      enqueueSnackbar('Order rescheduled successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to reschedule order', { variant: 'error' });
      console.error(error);
    },
  });
}

export function useMoveOrderMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

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
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
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
      enqueueSnackbar('Order moved successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to move order', { variant: 'error' });
      console.error(error);
    },
  });
}

export function useForceSendOrderMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
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
      enqueueSnackbar('Order sent successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to send order', { variant: 'error' });
      console.error(error);
    },
  });
}

export function useUnlockOrdersMutation() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: 'write:order' } });
      await axiosInstance.put(
        '/api/v1/order/unlock',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: async () => {
      enqueueSnackbar('Orders unlocked successfully', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to unlock orders', { variant: 'error' });
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
    return GroupAndOrderCart(coreCart, catalogSelectors.category);
  }, [order, catalogSelectors]);
}

export function useEventTitleStringForOrder(order: WOrderInstance | null) {
  const catalogSelectors = useCatalogSelectors();
  const fulfillment = useFulfillmentById(order?.fulfillment.selectedService || null);
  return useMemo(() => {
    if (catalogSelectors && order && fulfillment) {
      const serviceTime = WDateUtils.ComputeServiceDateTime(order.fulfillment);
      const cart = RebuildAndSortCart(order.cart, catalogSelectors, serviceTime, order.fulfillment.selectedService);
      return EventTitleStringBuilder(
        catalogSelectors,
        fulfillment,
        `${order.customerInfo.givenName} ${order.customerInfo.familyName}`,
        order.fulfillment,
        cart,
        order.specialInstructions ?? '',
      );
    }
    return '';
  }, [catalogSelectors, order, fulfillment]);
}
