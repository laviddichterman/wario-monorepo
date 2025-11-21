import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import type { IProduct } from "@wcp/wario-shared";

import { HOST_API } from "@/config";

import ElementDeleteComponent from "../element.delete.component";

export interface ProductQuickActionProps {
  products: IProduct[];
  productName: string;
  onCloseCallback: VoidFunction;
}
const BatchProductDeleteContainer = ({ products, onCloseCallback }: ProductQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const deleteProduct = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "delete:catalog" } });
        const response = await fetch(`${HOST_API}/api/v1/menu/product/batchDelete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(products.map(x => x.id)),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Deleted products.`)
          onCloseCallback();
        }
      } catch (error) {
        enqueueSnackbar(`Unable to delete products. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
      }
      setIsProcessing(false);
    }
  };

  return (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void deleteProduct()}
      name="Batch Products"
      isProcessing={isProcessing}
    />
  );
};

export default BatchProductDeleteContainer;
