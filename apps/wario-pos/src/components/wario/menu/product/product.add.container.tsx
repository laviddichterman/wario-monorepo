import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { useAddProductMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import {
  DEFAULT_PRODUCT_FORM,
  productFormAtom,
  productFormProcessingAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  DEFAULT_PRODUCT_INSTANCE_FORM,
  productInstanceFormAtom,
  productInstanceFormProcessingAtom,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceContainer } from './instance/product_instance.component';
import { ProductComponent } from './product.component';

interface ProductAddContainerProps {
  onCloseCallback: VoidFunction;
}

const ProductAddContainer = ({ onCloseCallback }: ProductAddContainerProps) => {
  const setProductForm = useSetAtom(productFormAtom);
  const setProductProcessing = useSetAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);

  const setInstanceForm = useSetAtom(productInstanceFormAtom);
  const setInstanceProcessing = useSetAtom(productInstanceFormProcessingAtom);
  const instanceForm = useAtomValue(productInstanceFormAtom);

  const addMutation = useAddProductMutation();
  useEffect(() => {
    setProductForm(DEFAULT_PRODUCT_FORM);
    setInstanceForm(DEFAULT_PRODUCT_INSTANCE_FORM);
    return () => {
      setProductForm(null);
      setInstanceForm(null);
    };
  }, [setProductForm, setInstanceForm]);

  const addProduct = () => {
    if (!productForm || !instanceForm || addMutation.isPending) return;

    setProductProcessing(true);
    setInstanceProcessing(true);

    addMutation.mutate(
      { ...toProductApiBody(productForm), instances: [toProductInstanceApiBody(instanceForm)] },
      {
        onSuccess: () => {
          toast.success(`Created base product ${instanceForm.displayName}`);
        },
        onError: (error) => {
          toast.error(`Unable to create ${instanceForm.displayName}. Got error: ${JSON.stringify(error, null, 2)}.`);
          console.error(error);
        },
        onSettled: () => {
          setProductProcessing(false);
          setInstanceProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  if (!productForm || !instanceForm) return null;

  return (
    <ProductComponent
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addProduct}
      productInstancesContent={<ProductInstanceContainer parent_product={toProductApiBody(productForm)} />}
    />
  );
};

export default ProductAddContainer;
