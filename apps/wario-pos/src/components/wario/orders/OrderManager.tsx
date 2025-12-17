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
  usePendingOrdersQuery, // NEW
  useUnlockOrdersMutation,
} from '@/hooks/useOrdersQuery';

import { TableWrapperComponent } from '../table_wrapper.component';

import { WOrderComponentCard } from './WOrderComponentCard';

export interface OrderManagerComponentProps {
  handleConfirmOrder: (id: string) => void;
}

type RowType = WOrderInstance;

const EventTitle = (params: GridRenderCellParams<RowType>) => {
  // Simplified title generation to avoid broken Redux selector
  const order = params.row;
  const title = `${order.customerInfo.givenName} ${order.customerInfo.familyName}`;
  return <>{title}</>;
};

export const OrderManagerComponent = ({ handleConfirmOrder }: OrderManagerComponentProps) => {
  const apiRef = useGridApiRef();
  const { data: ordersMap = {} } = usePendingOrdersQuery(); // Use polling hook for pending orders
  const unlockMutation = useUnlockOrdersMutation();
  const confirmMutation = useConfirmOrderMutation();

  const orders = Object.values(ordersMap).filter((x) => x.status === WOrderStatus.OPEN);

  const [hasNewOrder, setHasNewOrder] = useState(orders.length > 0);
  const [suppressedNewOrderNoticeForOrder, setSuppressedNewOrderNotice] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (orders.filter((x) => !Object.hasOwn(suppressedNewOrderNoticeForOrder, x.id)).length > 0) {
      setHasNewOrder(true);
    } else {
      setHasNewOrder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]); // Depend on length or specific updates

  const suppressNotice = () => {
    setSuppressedNewOrderNotice(
      orders.reduce((acc, order) => ({ ...acc, [order.id]: true }), suppressedNewOrderNoticeForOrder),
    );
    setHasNewOrder(false);
  };

  const callUnlockOrders = () => {
    unlockMutation.mutate();
  };

  if (hasNewOrder) {
    return (
      <Box
        onClick={() => {
          suppressNotice();
        }}
      >
        <FullScreenPulsingContainer
          children={
            <Typography variant="h3">
              {orders.length} new order{orders.length > 1 ? 's' : ''}
            </Typography>
          }
        />
      </Box>
    );
  }
  return (
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
                disabled={confirmMutation.isPending} // Mutations handle their own loading state
                onClick={() => {
                  handleConfirmOrder(params.row.id);
                }}
                key={`CONFIRM${params.row.id}`}
              />,
            ],
          },
        ]}
        onRowClick={(params) => {
          apiRef.current?.toggleDetailPanel(params.id);
        }}
        getDetailPanelContent={(params: GridRowParams<RowType>) => (
          <WOrderComponentCard orderId={params.row.id} handleConfirmOrder={handleConfirmOrder} onCloseCallback={null} />
        )}
        rows={orders}
      />
    </Card>
  );
};

export default OrderManagerComponent;
