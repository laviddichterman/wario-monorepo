import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useState } from 'react';

import { Button, Drawer, Grid } from '@mui/material';

import { paths } from '@/routes/paths';

import { useAppDispatch } from '@/hooks/useRedux';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import { BlockOffComp } from '@/components/wario/blockoff.component';
import { LeadTimesComp } from '@/components/wario/leadtimes.component';
import { OrderCalendar } from '@/components/wario/orders/OrderCalendar';
import { OrderManagerComponent } from '@/components/wario/orders/OrderManager';

import { DashboardContent } from '@/layouts/dashboard';
import { confirmOrder } from '@/redux/slices/OrdersSlice';


export function OrderListView() {
  const [isTimingDrawerOpen, setIsTimingDrawerOpen] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const { getAccessTokenSilently } = useAuth0();
  const toggleDrawer = useCallback(
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ['Tab', 'Shift'].includes((event as React.KeyboardEvent).key)
      ) {
        return;
      }
      setIsTimingDrawerOpen(open);
    },
    []
  );
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
            <Button
              variant="outlined"
              onClick={toggleDrawer(true)}
              sx={{ textTransform: 'capitalize' }}
            >
              Manage Order Timing
            </Button>

            <Drawer anchor={'bottom'} open={isTimingDrawerOpen} onClose={toggleDrawer(false)}>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    md: 12
                  }}>
                  <LeadTimesComp />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 12
                  }}>
                  <BlockOffComp />
                </Grid>
              </Grid>
            </Drawer>
            <OrderManagerComponent handleConfirmOrder={(id) => void handleConfirmOrder(id)} />
          </Grid>
          <Grid size={12}>
            <OrderCalendar initialView='listWeek' handleConfirmOrder={(id) => void handleConfirmOrder(id)} />
          </Grid>
        </Grid>

      </DashboardContent>
    </>
  );
}