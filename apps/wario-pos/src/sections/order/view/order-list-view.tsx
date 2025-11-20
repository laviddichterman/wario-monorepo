import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useState } from 'react';

import { Grid } from '@mui/material';

import { paths } from '@/routes/paths';

import { useAppDispatch } from '@/hooks/useRedux';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import { OrderCalendar } from '@/components/wario/orders/OrderCalendar';
import { OrderManagerComponent } from '@/components/wario/orders/OrderManager';

import { DashboardContent } from '@/layouts/dashboard';
import { confirmOrder } from '@/redux/slices/OrdersSlice';


// ----------------------------------------------------------------------


// ----------------------------------------------------------------------

export function OrderListView() {
  const dispatch = useAppDispatch();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const handleConfirmOrder = useCallback(async (id: string) => {
    const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order" } });
    void dispatch(confirmOrder({ orderId: id, additionalMessage: "", token: token }));
  }, [dispatch, getAccessTokenSilently]);


  return (
    <>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="List"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Order', href: paths.dashboard.order.root },
            { name: 'List' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Grid container spacing={2}>
          <Grid size={12}>
            <OrderManagerComponent handleConfirmOrder={(id) => void handleConfirmOrder(id)} />
          </Grid>
          <Grid size={12}>
            <OrderCalendar selectOrderById={setSelectedOrderId} />
          </Grid>
        </Grid>

      </DashboardContent>
    </>
  );
}