import { useAuth0 } from '@auth0/auth0-react';
import { useState } from "react";

import { Grid, TextField } from "@mui/material";

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { moveOrder } from "../../../redux/slices/OrdersSlice";
import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

type WOrderMoveComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderMoveComponent = (props: WOrderMoveComponentProps) => {
  const { getAccessTokenSilently } = useAuth0();
  const dispatch = useAppDispatch();
  const orderSliceState = useAppSelector(s => s.orders.requestStatus);
  const [destination, setDestination] = useState("");
  const [additionalMessage, setAdditionalMessage] = useState("");

  const submitToWario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (orderSliceState !== 'PENDING') {
      const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:order" } });
      await dispatch(moveOrder({ orderId: props.orderId, destination, additionalMessage, token: token }));
      if (props.onCloseCallback) {
        props.onCloseCallback(e); return;
      }
    }
  }

  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={(e) => void submitToWario(e)}
      isProcessing={orderSliceState === 'PENDING'}
      disableConfirmOn={orderSliceState === 'PENDING' || destination.length < 2}
      confirmText={'Send Move Ticket'}
      body={
        <>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Destination"
              type="text"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              multiline
              fullWidth
              minRows={additionalMessage.split('\n').length + 1}
              label="Additional message to expo"
              type="text"
              value={additionalMessage}
              onChange={(e) => { setAdditionalMessage(e.target.value); }}
            />
          </Grid>
        </>

      }
    />
  );
};

export default WOrderMoveComponent;
