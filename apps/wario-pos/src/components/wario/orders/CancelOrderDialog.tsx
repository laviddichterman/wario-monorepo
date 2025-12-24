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
  TextField,
} from '@mui/material';

import { useCancelOrderMutation } from '@/hooks/useOrdersQuery';

export type CancelOrderDialogProps = {
  open: boolean;
  orderId: string;
  onClose: () => void;
};

/**
 * Confirmation dialog for canceling an order.
 * Includes optional message to guest and confirmation checkbox.
 */
export function CancelOrderDialog({ open, orderId, onClose }: CancelOrderDialogProps) {
  const cancelMutation = useCancelOrderMutation();
  const [messageToGuest, setMessageToGuest] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleCancel = () => {
    cancelMutation.mutate(
      { orderId, reason: messageToGuest, emailCustomer: true },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    setMessageToGuest('');
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel Order</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, color: 'error.main' }}>
          This action is permanent and cannot be undone. The customer will be notified of the cancellation.
        </DialogContentText>

        <TextField
          autoFocus
          margin="dense"
          label="Message to Guest (optional)"
          placeholder="Enter a reason or message to include in the cancellation email"
          fullWidth
          multiline
          minRows={3}
          value={messageToGuest}
          onChange={(e) => {
            setMessageToGuest(e.target.value);
          }}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
              }}
              color="error"
            />
          }
          label="I understand this will permanently cancel the order and notify the customer"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={cancelMutation.isPending}>
          Back
        </Button>
        <Button
          onClick={handleCancel}
          color="error"
          variant="contained"
          disabled={!confirmed || cancelMutation.isPending}
        >
          {cancelMutation.isPending ? 'Canceling...' : 'Cancel Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CancelOrderDialog;
