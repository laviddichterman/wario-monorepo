import { useState } from 'react';

import { type FulfillmentConfig } from '@wcp/wario-shared/types';

import { useDeleteFulfillmentMutation } from '@/hooks/useFulfillmentMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from './menu/element.delete.component';

export interface FulfillmentQuickActionProps {
  fulfillment: FulfillmentConfig;
  onCloseCallback: VoidFunction;
}
const FulfillmentDeleteContainer = ({ fulfillment, onCloseCallback }: FulfillmentQuickActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const deleteMutation = useDeleteFulfillmentMutation();

  const deleteFulfillment = () => {
    if (!isProcessing) {
      setIsProcessing(true);
      deleteMutation.mutate(fulfillment.id, {
        onSuccess: () => {
          toast.success(`Deleted fulfillment: ${fulfillment.displayName}.`);
          onCloseCallback();
          setIsProcessing(false);
        },
        onError: (error) => {
          toast.error(`Unable to delete fulfillment ${fulfillment.displayName}. Got error: ${JSON.stringify(error)}.`);
          console.error(error);
          setIsProcessing(false);
        },
      });
    }
  };

  return (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => {
        deleteFulfillment();
      }}
      name={fulfillment.displayName}
      isProcessing={isProcessing}
    />
  );
};

export default FulfillmentDeleteContainer;
