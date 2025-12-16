import { useProductInstanceById } from '@wcp/wario-ux-shared/query';

import { useDeleteProductInstanceMutation } from '@/hooks/useProductInstanceMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from '../../element.delete.component';

export interface ProductInstanceQuickActionProps {
  product_id: string;
  product_instance_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceDeleteContainer = ({
  product_id,
  product_instance_id,
  onCloseCallback,
}: ProductInstanceQuickActionProps) => {
  const product_instance = useProductInstanceById(product_instance_id);

  const deleteMutation = useDeleteProductInstanceMutation();

  const deleteProductInstance = () => {
    if (!product_instance || deleteMutation.isPending) return;

    deleteMutation.mutate(
      {
        productId: product_id,
        instanceId: product_instance.id,
      },
      {
        onSuccess: () => {
          toast.success(`Deleted product: ${product_instance.displayName}.`);
        },
        onError: (error) => {
          toast.error(`Unable to delete ${product_instance.displayName}. Got error: ${JSON.stringify(error)}.`);
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  return (
    product_instance && (
      <ElementDeleteComponent
        onCloseCallback={onCloseCallback}
        onConfirmClick={deleteProductInstance}
        name={product_instance.displayName}
        isProcessing={deleteMutation.isPending}
      />
    )
  );
};

export default ProductInstanceDeleteContainer;
