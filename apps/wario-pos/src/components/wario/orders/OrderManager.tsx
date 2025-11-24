import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from "react";

import { CheckCircleOutline } from "@mui/icons-material";
import { Box, Button, Card, Tooltip, Typography } from "@mui/material";
import { GridActionsCellItem, type GridRenderCellParams, type GridRowParams, useGridApiRef } from "@mui/x-data-grid-premium";

import { WDateUtils, type WOrderInstance } from "@wcp/wario-shared";
import { FullScreenPulsingContainer } from "@wcp/wario-ux-shared";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { pollOpenOrders, unlockOrders } from "@/redux/slices/OrdersSlice";
import { selectEventTitleStringForOrder, selectOrdersNeedingAttention } from "@/redux/store";

import { TableWrapperComponent } from "../table_wrapper.component";

import { WOrderComponentCard } from "./WOrderComponentCard";

export interface OrderManagerComponentProps {
  handleConfirmOrder: (id: string) => void;
}

type RowType = WOrderInstance;

const EventTitle = (params: GridRenderCellParams<RowType>) => {
  const selectEventTitleString = useAppSelector(s => selectEventTitleStringForOrder(s, params.row));
  return <>{selectEventTitleString}</>;
}

export const OrderManagerComponent = ({ handleConfirmOrder }: OrderManagerComponentProps) => {
  const apiRef = useGridApiRef();
  const currentTime = useAppSelector(s => s.ws.currentTime);
  const orderSliceState = useAppSelector(s => s.orders.requestStatus)
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useAppDispatch();

  //const socketAuthState = useAppSelector((s) => s.orders.status);
  const pollOpenOrdersStatus = useAppSelector((s) => s.orders.pollingStatus);
  const orders = useAppSelector(selectOrdersNeedingAttention);
  const [hasNewOrder, setHasNewOrder] = useState(orders.length > 0);
  const [suppressedNewOrderNoticeForOrder, setSuppressedNewOrderNotice] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (orders.filter(x => !Object.hasOwn(suppressedNewOrderNoticeForOrder, x.id)).length > 0) {
      setHasNewOrder(true);
    }
    else {
      setHasNewOrder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);
  const suppressNotice = () => {
    setSuppressedNewOrderNotice(orders.reduce((acc, order) => ({ ...acc, [order.id]: true }), suppressedNewOrderNoticeForOrder));
    setHasNewOrder(false);
  }

  useEffect(() => {
    const pollForOrders = async () => {
      if (pollOpenOrdersStatus !== 'PENDING') {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "read:order" } });
        await dispatch(pollOpenOrders({ token, date: WDateUtils.formatISODate(currentTime) }));
      }
    }
    void pollForOrders();
    const timer = setInterval(() => void pollForOrders(), 30000);
    return () => { clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime])

  const callUnlockOrders = async () => {
    const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order" } });
    void dispatch(unlockOrders(token));
  }

  if (hasNewOrder) {
    return <Box onClick={() => { suppressNotice(); }}><FullScreenPulsingContainer children={<Typography variant='h3'>{orders.length} new order{orders.length > 1 ? 's' : ""}</Typography>} /></Box>;
  }
  return (
    <Card>
      <Button onClick={() => void callUnlockOrders()} >UNLOCK</Button>
      <TableWrapperComponent
        title="Orders Needing Attention"
        apiRef={apiRef}
        disableRowSelectionOnClick
        enableSearch={true}
        columns={[
          { headerName: "Date", field: "date", valueGetter: (_v, row: RowType) => row.fulfillment.selectedDate, flex: 1 },
          { headerName: "Time", field: "time", valueGetter: (_v, row: RowType) => WDateUtils.MinutesToPrintTime(row.fulfillment.selectedTime), flex: 1 },
          { headerName: "ShortName", field: "ordinal", renderCell: (params: GridRenderCellParams<RowType>) => <EventTitle {...params} />, flex: 5 },
          {
            headerName: "Confirm",
            field: 'actions',
            type: 'actions',
            getActions: (params: GridRowParams<WOrderInstance>) => [
              <GridActionsCellItem
                icon={<Tooltip title="Confirm Order"><CheckCircleOutline /></Tooltip>}
                label="Confirm Order"
                disabled={orderSliceState === 'PENDING'}
                onClick={() => { handleConfirmOrder(params.row.id); }}
                key={`CONFIRM${params.row.id}`} />
            ]
          },
        ]}
        onRowClick={(params) => { apiRef.current?.toggleDetailPanel(params.id); }}
        getDetailPanelContent={(params: GridRowParams<RowType>) => <WOrderComponentCard orderId={params.row.id} handleConfirmOrder={handleConfirmOrder} onCloseCallback={null} />}
        rows={orders}
      />
    </Card>


  );
}

export default OrderManagerComponent;