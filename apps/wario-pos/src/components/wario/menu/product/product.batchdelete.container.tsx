import { useSnackbar } from 'notistack';

import type { IProduct } from '@wcp/wario-shared';

import { useBatchDeleteProductsMutation } from '@/hooks/useProductMutations';

import ElementDeleteComponent from '../element.delete.component';

export interface ProductQuickActionProps {
  products: IProduct[];
  productName: string;
  onCloseCallback: VoidFunction;
}

const BatchProductDeleteContainer = ({ products, onCloseCallback }: ProductQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const batchDeleteMutation = useBatchDeleteProductsMutation();

  const deleteProducts = () => {
    if (batchDeleteMutation.isPending) return;

    batchDeleteMutation.mutate(
      { productIds: products.map((x) => x.id) },
      {
        onSuccess: () => {
          enqueueSnackbar(`Deleted products.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to delete products. Got error: ${JSON.stringify(error, null, 2)}.`, {
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
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={deleteProducts}
      name="Batch Products"
      isProcessing={batchDeleteMutation.isPending}
    />
  );
};

export default BatchProductDeleteContainer;
