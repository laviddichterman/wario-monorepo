import { useSnackbar } from 'notistack';

import { Grid } from '@mui/material';

import type { IProduct } from '@wcp/wario-shared/types';
import { useBaseProductNameByProductId, useProductById } from '@wcp/wario-ux-shared/query';

import { useSetProductDisabledMutation } from '@/hooks/useProductMutations';

import { ElementActionComponent } from '../element.action.component';

import type { ProductQuickActionProps } from './product.delete.container';

const ProductDisableContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useProductById(product_id);

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

  const setDisabledMutation = useSetProductDisabledMutation();

  const disableProduct = () => {
    if (setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      { id: product.id, disabled: { start: 1, end: 0 } },
      {
        onSuccess: () => {
          enqueueSnackbar(`Disabled ${productName}.`);
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
      onConfirmClick={disableProduct}
      isProcessing={setDisabledMutation.isPending}
      disableConfirmOn={setDisabledMutation.isPending}
      confirmText="Confirm"
      body={<Grid size={12}>Are you sure you'd like to disable {productName}?</Grid>}
    />
  );
};

export default ProductDisableContainer;
