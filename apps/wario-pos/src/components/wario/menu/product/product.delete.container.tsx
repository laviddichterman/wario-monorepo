import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { useBaseProductNameByProductId } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import ElementDeleteComponent from "../element.delete.component";

export interface ProductQuickActionProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}
const ProductDeleteContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const { enqueueSnackbar } = useSnackbar();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteProduct = async () => {
    if (!isProcessing && productName) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/menu/product/${product_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted product: ${productName}.`)
          onCloseCallback();
        }
      } catch (error) {
        enqueueSnackbar(`Unable to delete ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
      }
      setIsProcessing(false);
    }
  };

  return (
    productName && <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteProduct()}
      name={productName}
      isProcessing={isProcessing}
    />
  );
};

export default ProductDeleteContainer;
