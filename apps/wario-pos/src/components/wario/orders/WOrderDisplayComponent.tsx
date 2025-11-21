import { Grid } from "@mui/material";

import { WOrderStatus } from "@wcp/wario-shared";

import { useAppSelector } from "../../../hooks/useRedux";
import { getWOrderInstanceById } from "../../../redux/slices/OrdersSlice";
import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

import { WOrderCheckoutCartContainer } from "./WOrderCheckoutCartContainer";
import { WOrderServiceInfoTableContainer } from "./WOrderServiceInfoTableContainer";

export type WOrderDisplayComponentProps = {
  orderId: string;
  callConfirm: (id: string) => void;
  onCloseCallback: ElementActionComponentProps['onCloseCallback'];
};


export const WOrderDisplayComponent = ({ orderId, callConfirm, onCloseCallback }: WOrderDisplayComponentProps) => {
  const orderSliceState = useAppSelector(s => s.orders.requestStatus)
  const order = useAppSelector(s => getWOrderInstanceById(s.orders.orders, orderId));

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => { callConfirm(order.id); }}
      isProcessing={orderSliceState === 'PENDING'}
      disableConfirmOn={order.status !== WOrderStatus.OPEN}
      confirmText={"Confirm!"}
      body={<Grid size={12}>
        <WOrderServiceInfoTableContainer order={order} />
        <WOrderCheckoutCartContainer order={order} hideProductDescriptions />
      </Grid>
      }
    />
  );
}