import { useAuth0 } from '@auth0/auth0-react';
import { useState } from "react";

import { Grid, TextField } from "@mui/material";

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { cancelOrder } from "../../../redux/slices/OrdersSlice";
import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";
import { ToggleBooleanPropertyComponent } from "../property-components/ToggleBooleanPropertyComponent";

type WOrderCancelComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderCancelComponent = (props: WOrderCancelComponentProps) => {
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useAppDispatch();
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const orderSliceState = useAppSelector(s => s.orders.requestStatus)

  const [cancelationReason, setCancelationReason] = useState("");

  const submitToWario: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    if (orderSliceState !== 'PENDING') {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: "cancel:order" } });
      await dispatch(cancelOrder({ orderId: props.orderId, emailCustomer: true, reason: cancelationReason, token: token }));
      props.onCloseCallback && props.onCloseCallback(e);
    }
  }

  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={submitToWario}
      isProcessing={orderSliceState === 'PENDING'}
      disableConfirmOn={orderSliceState === 'PENDING' || !confirmCheckbox}
      confirmText={'Process Order Cancelation'}
      body={<>
        <Grid size={12}>
          <TextField
            multiline
            fullWidth
            minRows={cancelationReason.split('\n').length + 1}
            label="CUSTOMER FACING (they will read this) cancelation reason (optional)"
            type="text"
            value={cancelationReason}
            onChange={(e) => { setCancelationReason(e.target.value); }}
          />
        </Grid>
        <Grid size={12}>
          <ToggleBooleanPropertyComponent
            disabled={orderSliceState === 'PENDING'}
            label="Cancellation is permanent, confirm this is understood before proceeding"
            setValue={setConfirmCheckbox}
            value={confirmCheckbox}
            labelPlacement={"end"}
          />

        </Grid>
      </>
      }
    />
  );
};

export default WOrderCancelComponent;
