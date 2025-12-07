import { useState } from 'react';

import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { useCancelOrderMutation } from '@/hooks/useOrdersQuery';

import { ElementActionComponent, type ElementActionComponentProps } from '../menu/element.action.component';
import { ToggleBooleanPropertyComponent } from '../property-components/ToggleBooleanPropertyComponent';

type WOrderCancelComponentProps = { orderId: string; onCloseCallback: ElementActionComponentProps['onCloseCallback'] };
const WOrderCancelComponent = (props: WOrderCancelComponentProps) => {
  const cancelMutation = useCancelOrderMutation();
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  const [cancelationReason, setCancelationReason] = useState('');

  const submitToWario = (e: React.MouseEvent<HTMLButtonElement>) => {
    cancelMutation.mutate(
      { orderId: props.orderId, emailCustomer: true, reason: cancelationReason },
      {
        onSuccess: () => {
          if (props.onCloseCallback) {
            props.onCloseCallback(e);
          }
        },
      },
    );
  };

  return (
    <ElementActionComponent
      onCloseCallback={props.onCloseCallback}
      onConfirmClick={submitToWario}
      isProcessing={cancelMutation.isPending}
      disableConfirmOn={cancelMutation.isPending || !confirmCheckbox}
      confirmText={'Process Order Cancelation'}
      body={
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              multiline
              fullWidth
              minRows={cancelationReason.split('\n').length + 1}
              label="CUSTOMER FACING (they will read this) cancelation reason (optional)"
              type="text"
              value={cancelationReason}
              onChange={(e) => {
                setCancelationReason(e.target.value);
              }}
            />
          </Grid>
          <Grid size={12}>
            <ToggleBooleanPropertyComponent
              disabled={cancelMutation.isPending}
              label="Cancellation is permanent, confirm this is understood before proceeding"
              setValue={setConfirmCheckbox}
              value={confirmCheckbox}
              labelPlacement={'end'}
            />
          </Grid>
        </Grid>
      }
    />
  );
};

export default WOrderCancelComponent;
