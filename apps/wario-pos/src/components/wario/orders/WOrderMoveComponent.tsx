import { useState } from "react";

import { Grid, TextField } from "@mui/material";

import { useMoveOrderMutation } from "@/hooks/useOrdersQuery";

import { ElementActionComponent, type ElementActionComponentProps } from "../menu/element.action.component";

type WOrderMoveComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderMoveComponent = (props: WOrderMoveComponentProps) => {
  const moveMutation = useMoveOrderMutation();
  const [destination, setDestination] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState("");

  const submitToWario = (e: React.MouseEvent<HTMLButtonElement>) => {
    moveMutation.mutate(
      { orderId: props.orderId, destination, additionalMessage },
      {
        onSuccess: () => {
          if (props.onCloseCallback) {
            props.onCloseCallback(e);
          }
        }
      }
    );
  }

  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={submitToWario}
      isProcessing={moveMutation.isPending}
      disableConfirmOn={moveMutation.isPending || destination.length < 2}
      confirmText={'Send Move Ticket'}
      body={
        <>
          <Grid size={12}>
            <TextField
              fullWidth
              label="Destination"
              type="text"
              value={destination}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDestination(e.target.value); }}
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
