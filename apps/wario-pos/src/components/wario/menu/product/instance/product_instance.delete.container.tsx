import { useSnackbar } from 'notistack';

import { useProductInstanceById } from '@wcp/wario-ux-shared/query';

import { useDeleteProductInstanceMutation } from '@/hooks/useProductInstanceMutations';

import ElementDeleteComponent from '../../element.delete.component';

export interface ProductInstanceQuickActionProps {
  product_instance_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceDeleteContainer = ({ product_instance_id, onCloseCallback }: ProductInstanceQuickActionProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const product_instance = useProductInstanceById(product_instance_id);

  const deleteMutation = useDeleteProductInstanceMutation();

  const deleteProductInstance = () => {
    if (!product_instance || deleteMutation.isPending) return;

    deleteMutation.mutate(
      {
        productId: product_instance.productId,
        instanceId: product_instance.id,
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Deleted product: ${product_instance.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to delete ${product_instance.displayName}. Got error: ${JSON.stringify(error)}.`, {
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
