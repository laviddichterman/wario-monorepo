import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { Grid } from "@mui/material";

import type { IProduct } from "@wcp/wario-shared";
import { useBaseProductNameByProductId, useValueFromProductEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ElementActionComponent } from "../element.action.component";

import type { ProductQuickActionProps } from './product.delete.container';

const ProductDisableContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useValueFromProductEntryById(product_id, "product");
  if (!product || !productName) {
    return null;
  }
  return <ProductDisableContainerInner product={product} productName={productName} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  product: IProduct;
  productName: string;
  onCloseCallback: VoidFunction;
}

const ProductDisableContainerInner = ({ product, productName, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const editProduct = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: IProduct = Object.assign({}, product, {
          disabled: { start: 1, end: 0 }
        });
        const response = await fetch(`${HOST_API}/api/v1/menu/product/${product.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (response.status === 200) {
          enqueueSnackbar(`Disabled ${productName}.`)
          onCloseCallback();
        }
        setIsProcessing(false);
      } catch (error) {
        enqueueSnackbar(`Unable to update ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`, { variant: "error" });
        console.error(error);
        setIsProcessing(false);
      }
    }
  };

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={() => void editProduct()}
      isProcessing={isProcessing}
      disableConfirmOn={isProcessing}
      confirmText="Confirm"
      body={
        <Grid size={12}>
          Are you sure you'd like to disable {productName}?
        </Grid>
      }
    />
  );
};

export default ProductDisableContainer;