import { useAuth0 } from '@auth0/auth0-react';
import { endOfDay, getTime } from 'date-fns';
import { useSnackbar } from "notistack";
import { useState } from "react";

import { Grid } from "@mui/material";

import type { IProduct } from "@wcp/wario-shared";
import { useBaseProductNameByProductId, useCurrentTime, useValueFromProductEntryById } from '@wcp/wario-ux-shared/query';

import { HOST_API } from "@/config";

import { ElementActionComponent } from "../element.action.component";

import type { ProductQuickActionProps } from './product.delete.container';

const ProductDisableUntilEodContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useValueFromProductEntryById(product_id, "product");
  const currentTime = useCurrentTime();

  if (!product || !productName) {
    return null;
  }

  return <ProductDisableUntilEodContainerInner product={product} productName={productName} currentTime={currentTime} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  product: IProduct;
  productName: string;
  currentTime: number;
  onCloseCallback: VoidFunction;
}

const ProductDisableUntilEodContainerInner = ({ product, productName, currentTime, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isProcessing, setIsProcessing] = useState(false);
  const { getAccessTokenSilently } = useAuth0();
  const editProduct = async () => {
    if (!isProcessing) {
      setIsProcessing(true);
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { scope: "write:catalog" } });
        const body: IProduct = Object.assign({}, product, {
          disabled: { start: currentTime, end: getTime(endOfDay(currentTime)) }
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
          enqueueSnackbar(`Disabled ${productName} until EOD.`)
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
          Are you sure you'd like to disable {productName} until end-of-day?
        </Grid>
      }
    />
  );
};

export default ProductDisableUntilEodContainer;