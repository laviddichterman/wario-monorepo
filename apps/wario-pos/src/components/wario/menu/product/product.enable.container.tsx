import { useSnackbar } from 'notistack';

import { Grid } from '@mui/material';

import type { IProduct } from '@wcp/wario-shared/types';
import { useBaseProductNameByProductId, useProductById } from '@wcp/wario-ux-shared/query';

import { useSetProductDisabledMutation } from '@/hooks/useProductMutations';

import { ElementActionComponent } from '../element.action.component';

import type { ProductQuickActionProps } from './product.delete.container';

const ProductEnableContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useProductById(product_id);

  if (!product || !productName) {
    return null;
  }

  return <ProductEnableContainerInner product={product} productName={productName} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  product: IProduct;
  productName: string;
  onCloseCallback: VoidFunction;
}

const ProductEnableContainerInner = ({ product, productName, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setDisabledMutation = useSetProductDisabledMutation();

  const enableProduct = () => {
    if (setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      { id: product.id, disabled: null },
      {
        onSuccess: () => {
          enqueueSnackbar(`Enabled ${productName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to update ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`, {
            variant: 'error',
          });
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  return (
    <ElementActionComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={enableProduct}
      isProcessing={setDisabledMutation.isPending}
      disableConfirmOn={setDisabledMutation.isPending}
      confirmText="Confirm"
      body={<Grid size={12}>Are you sure you'd like to enable {productName}?</Grid>}
    />
  );
};

export default ProductEnableContainer;
