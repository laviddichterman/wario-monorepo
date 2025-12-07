import { useCallback, useState } from 'react';

import { Button, Drawer, Grid } from '@mui/material';

import { paths } from '@/routes/paths';

import { useConfirmOrderMutation } from '@/hooks/useOrdersQuery';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import { BlockOffComp } from '@/components/wario/blockoff.component';
import { LeadTimesComp } from '@/components/wario/leadtimes.component';
import { OrderCalendar } from '@/components/wario/orders/OrderCalendar';
import { OrderManagerComponent } from '@/components/wario/orders/OrderManager';

import { DashboardContent } from '@/layouts/dashboard';

export function OrderListView() {
  const [isTimingDrawerOpen, setIsTimingDrawerOpen] = useState<boolean>(false);
  const confirmMutation = useConfirmOrderMutation();
  const toggleDrawer = useCallback(
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (event.type === 'keydown' && ['Tab', 'Shift'].includes((event as React.KeyboardEvent).key)) {
        return;
      }
      setIsTimingDrawerOpen(open);
    },
    [],
  );

  const handleConfirmOrder = (orderId: string) => {
    confirmMutation.mutate(
      { orderId: orderId, additionalMessage: '' },
      {
        onSuccess: () => {},
      },
    );
  };
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
            <Button variant="outlined" onClick={toggleDrawer(true)} sx={{ textTransform: 'capitalize' }}>
              Manage Order Timing
            </Button>

            <Drawer anchor={'bottom'} open={isTimingDrawerOpen} onClose={toggleDrawer(false)}>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    md: 12,
                  }}
                >
                  <LeadTimesComp />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 12,
                  }}
                >
                  <BlockOffComp />
                </Grid>
              </Grid>
            </Drawer>
            <OrderManagerComponent handleConfirmOrder={handleConfirmOrder} />
          </Grid>
          <Grid size={12}>
            <OrderCalendar initialView="listWeek" handleConfirmOrder={handleConfirmOrder} />
          </Grid>
        </Grid>
      </DashboardContent>
    </>
  );
}
