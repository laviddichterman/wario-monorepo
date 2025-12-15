// import { useCallback, useState } from 'react';

import Grid from '@mui/material/Grid';

import { WOrderStatus } from '@wcp/wario-shared/logic';
import { type WOrderInstance } from '@wcp/wario-shared/types';

import { paths } from '@/routes/paths';

import { WOrderComponentCard } from '@/components/wario/orders/WOrderComponentCard';

import { DashboardContent } from '@/layouts/dashboard';

import { OrderDetailsToolbar } from '../order-details-toolbar';

// ----------------------------------------------------------------------

type Props = {
  order?: WOrderInstance;
};

export function OrderDetailsView({ order }: Props) {
  // const [status, setStatus] = useState(order?.status);

  // const handleChangeStatus = useCallback((newValue: string) => {
  //   setStatus(newValue);
  // }, []);

  return (
    <DashboardContent>
      <OrderDetailsToolbar
        status={order?.status}
        createdAt={order?.metrics?.submitTime}
        orderNumber={order?.id}
        backHref={paths.dashboard.order.root}
        // onChangeStatus={handleChangeStatus}
        statusOptions={Object.keys(WOrderStatus).map((key) => ({
          value: WOrderStatus[key as keyof typeof WOrderStatus],
          label: WOrderStatus[key as keyof typeof WOrderStatus],
        }))}
      />

      <Grid container spacing={3}>
        {order && <WOrderComponentCard orderId={order.id} handleConfirmOrder={() => {}} onCloseCallback={() => {}} />}
      </Grid>
    </DashboardContent>
  );
}
