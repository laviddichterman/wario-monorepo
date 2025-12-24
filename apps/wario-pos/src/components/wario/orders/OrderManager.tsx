import { useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { CheckCircleOutline } from '@mui/icons-material';
import { Box, Button, Card, Tooltip, Typography } from '@mui/material';
import {
  GridActionsCellItem,
  type GridRenderCellParams,
  type GridRowParams,
  useGridApiRef,
} from '@mui/x-data-grid-premium';

import { WDateUtils, WOrderStatus } from '@wcp/wario-shared/logic';
import { type WOrderInstance } from '@wcp/wario-shared/types';
import { FullScreenPulsingContainer } from '@wcp/wario-ux-shared/containers';

import {
  useConfirmOrderMutation,
  useEventTitleStringForOrder,
  usePendingOrdersQuery,
  useUnlockOrdersMutation,
} from '@/hooks/useOrdersQuery';

import { orderDrawerAtom } from '@/atoms/drawerState';

import { TableWrapperComponent } from '../table_wrapper.component';

// Drawer title moved to GlobalOrderDrawer

type RowType = WOrderInstance;

const EventTitle = (params: GridRenderCellParams<RowType>) => {
  const order = params.row;
  const title = useEventTitleStringForOrder(order);
  return <>{title || 'Loading...'}</>;
};

export const OrderManagerComponent = () => {
  const apiRef = useGridApiRef();
  const { data: ordersMap = {} } = usePendingOrdersQuery();
  const unlockMutation = useUnlockOrdersMutation();
  const confirmMutation = useConfirmOrderMutation();

  const orders = Object.values(ordersMap).filter((x) => x.status === WOrderStatus.OPEN);

  const [hasNewOrder, setHasNewOrder] = useState(orders.length > 0);
  const [suppressedNewOrderNoticeForOrder, setSuppressedNewOrderNotice] = useState<Record<string, boolean>>({});

  const setDrawerState = useSetAtom(orderDrawerAtom);

  useEffect(() => {
    if (orders.filter((x) => !Object.hasOwn(suppressedNewOrderNoticeForOrder, x.id)).length > 0) {
      setHasNewOrder(true);
    } else {
      setHasNewOrder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  const suppressNotice = () => {
    setSuppressedNewOrderNotice(
      orders.reduce((acc, order) => ({ ...acc, [order.id]: true }), suppressedNewOrderNoticeForOrder),
    );
    setHasNewOrder(false);
  };

  const callUnlockOrders = () => {
    unlockMutation.mutate();
  };

  const handleRowClick = (orderId: string) => {
    setDrawerState({ orderId, isOpen: true });
  };

  /* Drawer close handled globally now */

  const handleConfirmOrder = (orderId: string) => {
    confirmMutation.mutate({ orderId, additionalMessage: '' });
  };

  if (hasNewOrder) {
    return (
      <Box
        onClick={() => {
          suppressNotice();
        }}
      >
        <FullScreenPulsingContainer>
          <Typography variant="h3">
            {orders.length} new order{orders.length > 1 ? 's' : ''}
          </Typography>
        </FullScreenPulsingContainer>
      </Box>
    );
  }

  return (
    <>
      <Card>
        <Button
          onClick={() => {
            callUnlockOrders();
          }}
          disabled={unlockMutation.isPending}
        >
          UNLOCK
        </Button>
        <TableWrapperComponent
          title="Orders Needing Attention"
          apiRef={apiRef}
          disableRowSelectionOnClick
          enableSearch={true}
          columns={[
            {
              headerName: 'Date',
              field: 'date',
              valueGetter: (_v, row: RowType) => row.fulfillment.selectedDate,
              flex: 1,
            },
            {
              headerName: 'Time',
              field: 'time',
              valueGetter: (_v, row: RowType) => WDateUtils.MinutesToPrintTime(row.fulfillment.selectedTime),
              flex: 1,
            },
            {
              headerName: 'ShortName',
              field: 'ordinal',
              renderCell: (params: GridRenderCellParams<RowType>) => <EventTitle {...params} />,
              flex: 5,
            },
            {
              headerName: 'Confirm',
              field: 'actions',
              type: 'actions',
              getActions: (params: GridRowParams<WOrderInstance>) => [
                <GridActionsCellItem
                  icon={
                    <Tooltip title="Confirm Order">
                      <CheckCircleOutline />
                    </Tooltip>
                  }
                  label="Confirm Order"
                  disabled={confirmMutation.isPending}
                  onClick={() => {
                    handleConfirmOrder(params.row.id);
                  }}
                  key={`CONFIRM${params.row.id}`}
                />,
              ],
            },
          ]}
          onRowClick={(params: { row: WOrderInstance }) => {
            handleRowClick(params.row.id);
          }}
          rows={orders}
        />
      </Card>
    </>
  );
};

export default OrderManagerComponent;
