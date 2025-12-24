import { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';

import { useForceSendOrderMutation } from '@/hooks/useOrdersQuery';

export type ForceSendOrderDialogProps = {
  open: boolean;
  orderId: string;
  onClose: () => void;
};

/**
 * Confirmation dialog for force-sending an order.
 * This is a dangerous operation that bypasses normal order flow.
 */
export function ForceSendOrderDialog({ open, orderId, onClose }: ForceSendOrderDialogProps) {
  const forceSendMutation = useForceSendOrderMutation();
  const [confirmed, setConfirmed] = useState(false);

  const handleForceSend = () => {
    forceSendMutation.mutate(
      { orderId },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'warning.main' }}>Force Send Order</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          This will force-send the order to printers, bypassing the normal order flow. Use this only if the order was
          missed or needs to be re-sent.
        </DialogContentText>

        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
              }}
              color="warning"
            />
          }
          label="I understand this will send the order to printers immediately"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={forceSendMutation.isPending}>
          Back
        </Button>
        <Button
          onClick={handleForceSend}
          color="warning"
          variant="contained"
          disabled={!confirmed || forceSendMutation.isPending}
        >
          {forceSendMutation.isPending ? 'Sending...' : 'Force Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ForceSendOrderDialog;
