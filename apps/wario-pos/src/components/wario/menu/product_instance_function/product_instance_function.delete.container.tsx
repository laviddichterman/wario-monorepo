import { useProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import { useDeleteProductInstanceFunctionMutation } from '@/hooks/useProductInstanceFunctionMutations';

import { toast } from '@/components/snackbar';

import ElementDeleteComponent from '../element.delete.component';

export interface ProductInstanceFunctionQuickActionProps {
  pifId: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionDeleteContainer = ({
  pifId,
  onCloseCallback,
}: ProductInstanceFunctionQuickActionProps) => {
  const productInstanceFunction = useProductInstanceFunctionById(pifId);
  const deleteMutation = useDeleteProductInstanceFunctionMutation();

  const deleteProductInstanceFunction = () => {
    if (deleteMutation.isPending || !productInstanceFunction) return;

    deleteMutation.mutate(pifId, {
      onSuccess: () => {
        toast.success(`Deleted product instance function: ${productInstanceFunction.name}.`);
      },
      onError: (error) => {
        toast.error(
          `Unable to delete product instance function: ${productInstanceFunction.name}. Got error ${JSON.stringify(error, null, 2)}`,
        );
        console.error(error);
      },
      onSettled: () => {
        onCloseCallback();
      },
    });
  };

  return productInstanceFunction ? (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={deleteProductInstanceFunction}
      name={productInstanceFunction.name}
      isProcessing={deleteMutation.isPending}
    />
  ) : (
    <></>
  );
};

export default ProductInstanceFunctionDeleteContainer;
