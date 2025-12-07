import { Grid } from '@mui/material';

import { WOrderStatus } from '@wcp/wario-shared';

import { useConfirmOrderMutation, useOrderById } from '@/hooks/useOrdersQuery';

import { ElementActionComponent, type ElementActionComponentProps } from '../menu/element.action.component';

import { WOrderCheckoutCartContainer } from './WOrderCheckoutCartContainer';
import { WOrderServiceInfoTableContainer } from './WOrderServiceInfoTableContainer';

export type WOrderDisplayComponentProps = {
  orderId: string;
  onCloseCallback: ElementActionComponentProps['onCloseCallback'];
  callConfirm?: (id: string) => void; // Optional now, kept for backward compatibility if needed
};

export const WOrderDisplayComponent = ({ orderId, onCloseCallback }: WOrderDisplayComponentProps) => {
  const confirmMutation = useConfirmOrderMutation();
  const order = useOrderById(orderId);

  if (!order) return null;

  const handleConfirm = () => {
    confirmMutation.mutate(
      { orderId: order.id, additionalMessage: '' },
      {
        onSuccess: () => {},
      },
    );
  };

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={handleConfirm}
      isProcessing={confirmMutation.isPending}
      disableConfirmOn={order.status !== WOrderStatus.OPEN}
      confirmText={'Confirm!'}
      body={
        <Grid size={12}>
          <WOrderServiceInfoTableContainer order={order} />
          <WOrderCheckoutCartContainer order={order} hideProductDescriptions />
        </Grid>
      }
    />
  );
};
