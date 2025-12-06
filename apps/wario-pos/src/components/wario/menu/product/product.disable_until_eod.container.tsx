import { endOfDay, getTime } from 'date-fns';
import { useSnackbar } from 'notistack';

import { Grid } from '@mui/material';

import type { IProduct } from '@wcp/wario-shared';
import {
  useBaseProductNameByProductId,
  useCurrentTime,
  useValueFromProductEntryById,
} from '@wcp/wario-ux-shared/query';

import { useSetProductDisabledMutation } from '@/hooks/useProductMutations';

import { ElementActionComponent } from '../element.action.component';

import type { ProductQuickActionProps } from './product.delete.container';

const ProductDisableUntilEodContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useValueFromProductEntryById(product_id, 'product');
  const currentTime = useCurrentTime();

  if (!product || !productName) {
    return null;
  }

  return (
    <ProductDisableUntilEodContainerInner
      product={product}
      productName={productName}
      currentTime={currentTime}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  product: IProduct;
  productName: string;
  currentTime: number;
  onCloseCallback: VoidFunction;
}

const ProductDisableUntilEodContainerInner = ({ product, productName, currentTime, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setDisabledMutation = useSetProductDisabledMutation();

  const disableProduct = () => {
    if (setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      { product, disabled: { start: currentTime, end: getTime(endOfDay(currentTime)) } },
      {
        onSuccess: () => {
          enqueueSnackbar(`Disabled ${productName} until EOD.`);
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
      body={<Grid size={12}>Are you sure you'd like to disable {productName} until end-of-day?</Grid>}
    />
  );
};

export default ProductDisableUntilEodContainer;
