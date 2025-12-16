import { useBaseProductNameByProductId } from '@wcp/wario-ux-shared/query';

import { useDeleteProductMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from '../element.delete.component';

export interface ProductQuickActionProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}

const ProductDeleteContainer = ({ product_id, onCloseCallback }: ProductQuickActionProps) => {
  const productName = useBaseProductNameByProductId(product_id);

  const deleteMutation = useDeleteProductMutation();

  const deleteProduct = () => {
    if (!productName || deleteMutation.isPending) return;

    deleteMutation.mutate(product_id, {
      onSuccess: () => {
        toast.success(`Deleted product: ${productName}.`);
      },
      onError: (error) => {
        toast.error(`Unable to delete ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`);
        console.error(error);
      },
      onSettled: () => {
        onCloseCallback();
      },
    });
  };

  return (
    productName && (
      <ElementDeleteComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={deleteProduct}
        name={productName}
        isProcessing={deleteMutation.isPending}
      />
    )
  );
};

export default ProductDeleteContainer;
