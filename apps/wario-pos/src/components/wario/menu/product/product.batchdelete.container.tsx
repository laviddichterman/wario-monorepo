import type { IProduct } from '@wcp/wario-shared/types';

import { useBatchDeleteProductsMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from '../element.delete.component';

export interface ProductQuickActionProps {
  products: IProduct[];
  productName: string;
  onCloseCallback: VoidFunction;
}

const BatchProductDeleteContainer = ({ products, onCloseCallback }: ProductQuickActionProps) => {
  const batchDeleteMutation = useBatchDeleteProductsMutation();

  const deleteProducts = () => {
    if (batchDeleteMutation.isPending) return;

    batchDeleteMutation.mutate(
      { productIds: products.map((x) => x.id) },
      {
        onSuccess: () => {
          toast.success(`Deleted products.`);
        },
        onError: (error) => {
          toast.error(`Unable to delete products. Got error: ${JSON.stringify(error, null, 2)}.`);
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
