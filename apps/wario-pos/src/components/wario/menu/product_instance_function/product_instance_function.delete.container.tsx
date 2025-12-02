import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { useProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import ElementDeleteComponent from "../element.delete.component";

export interface ProductInstanceFunctionQuickActionProps {
  pifId: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionDeleteContainer = ({ pifId, onCloseCallback }: ProductInstanceFunctionQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const productInstanceFunction = useProductInstanceFunctionById(pifId);
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteProductInstanceFunction = async () => {
    if (!isProcessing && productInstanceFunction) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/query/language/productinstancefunction/${pifId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted product instance function: ${productInstanceFunction.name}.`);
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to delete product instance function: ${productInstanceFunction.name}. Got error ${JSON.stringify(error, null, 2)}`, { variant: 'error' });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return productInstanceFunction ?
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteProductInstanceFunction()}
      name={productInstanceFunction.name}
      isProcessing={isProcessing}
    />
    : <></>;
};

export default ProductInstanceFunctionDeleteContainer;
