import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { getProductInstanceById } from "@wcp/wario-ux-shared";

import { HOST_API } from "../../../../../config";
import { useAppSelector } from "../../../../../hooks/useRedux";
import ElementDeleteComponent from "../../element.delete.component";

export interface ProductInstanceQuickActionProps {
  product_instance_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceDeleteContainer = ({ product_instance_id, onCloseCallback }: ProductInstanceQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const product_instance = useAppSelector(s => getProductInstanceById(s.ws.productInstances, product_instance_id));
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteProductInstance = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/menu/product/${product_instance.productId}/${product_instance.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted product: ${product_instance.displayName}.`)
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to delete ${product_instance.displayName}. Got error: ${JSON.stringify(error)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteProductInstance()}
      name={product_instance.displayName}
      isProcessing={isProcessing}
    />
  );
};

export default ProductInstanceDeleteContainer;
