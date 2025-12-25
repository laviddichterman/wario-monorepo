import { useCallback, useState } from 'react';

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';

import { paths } from '@/routes/paths';

import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
import { BlockOffComp } from '@/components/wario/blockoff.component';
import { LeadTimesComp } from '@/components/wario/leadtimes.component';
import { GlobalOrderDrawer } from '@/components/wario/orders/GlobalOrderDrawer';
import { OrderCalendar } from '@/components/wario/orders/OrderCalendar';
import { OrderManagerComponent } from '@/components/wario/orders/OrderManager';

import { DashboardContent } from '@/layouts/dashboard';

export function OrderListView() {
  const [isTimingDrawerOpen, setIsTimingDrawerOpen] = useState<boolean>(false);
  const toggleDrawer = useCallback(
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (event.type === 'keydown' && ['Tab', 'Shift'].includes((event as React.KeyboardEvent).key)) {
        return;
      }
      setIsTimingDrawerOpen(open);
    },
    [],
  );

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

        <Button variant="outlined" onClick={toggleDrawer(true)} sx={{ textTransform: 'capitalize', mb: 2 }}>
          Manage Order Timing
        </Button>

        <Drawer
          anchor="right"
          open={isTimingDrawerOpen}
          onClose={toggleDrawer(false)}
          slotProps={{
            paper: {
              sx: {
                width: { xs: '100%', sm: 420 },
                maxWidth: '100vw',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6">Manage Order Timing</Typography>
              <IconButton onClick={toggleDrawer(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Stack spacing={2}>
                <LeadTimesComp />
                <Divider />
                <BlockOffComp />
              </Stack>
            </Box>
          </Box>
        </Drawer>

        <OrderManagerComponent />
        <GlobalOrderDrawer />
        <OrderCalendar initialView="listWeek" />
      </DashboardContent>
    </>
  );
}
