import { endOfDay, getTime } from 'date-fns';

import { Grid } from '@mui/material';

import type { IProduct } from '@wcp/wario-shared/types';
import { useBaseProductNameByProductId, useCurrentTime, useProductById } from '@wcp/wario-ux-shared/query';

import { useSetProductDisabledMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import { ElementActionComponent } from '../element.action.component';

import type { ProductQuickActionProps } from './product.delete.container';

const ProductDisableUntilEodContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useProductById(product_id);
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
  const setDisabledMutation = useSetProductDisabledMutation();

  const disableProduct = () => {
    if (setDisabledMutation.isPending) return;

    setDisabledMutation.mutate(
      { id: product.id, disabled: { start: currentTime, end: getTime(endOfDay(currentTime)) } },
      {
        onSuccess: () => {
          toast.success(`Disabled ${productName} until EOD.`);
        },
        onError: (error) => {
          toast.error(`Unable to update ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`);
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
