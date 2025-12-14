import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

import { type FulfillmentConfig } from '@wcp/wario-shared/types';

import { HOST_API } from '@/config';

import ElementDeleteComponent from './menu/element.delete.component';

export interface FulfillmentQuickActionProps {
  fulfillment: FulfillmentConfig;
  onCloseCallback: VoidFunction;
}
const FulfillmentDeleteContainer = ({ fulfillment, onCloseCallback }: FulfillmentQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteFulfillment = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: 'delete:catalog' } });
        const response = await fetch(`${HOST_API}/api/v1/config/fulfillment/${fulfillment.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted fulfillment: ${fulfillment.displayName}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(
          `Unable to delete fulfillment ${fulfillment.displayName}. Got error: ${JSON.stringify(error)}.`,
          { variant: 'error' },
        );
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteFulfillment()}
      name={fulfillment.displayName}
      isProcessing={isProcessing}
    />
  );
};

export default FulfillmentDeleteContainer;
