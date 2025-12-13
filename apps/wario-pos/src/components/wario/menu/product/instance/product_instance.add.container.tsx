import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IProduct } from '@wcp/wario-shared';
import { useProductById } from '@wcp/wario-ux-shared/query';

import { useAddProductInstanceMutation } from '@/hooks/useProductInstanceMutations';

import {
  DEFAULT_PRODUCT_INSTANCE_FORM,
  productInstanceFormAtom,
  productInstanceFormProcessingAtom,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceActionContainer } from './product_instance.component';

interface ProductInstanceAddContainerProps {
  parent_product_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceAddContainer = ({ parent_product_id, onCloseCallback }: ProductInstanceAddContainerProps) => {
  const parent_product = useProductById(parent_product_id);

  if (!parent_product) {
    return null;
  }

  return <ProductInstanceAddContainerInner parent_product={parent_product} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  parent_product: IProduct;
  onCloseCallback: VoidFunction;
}

const ProductInstanceAddContainerInner = ({ parent_product, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(productInstanceFormAtom);
  const setIsProcessing = useSetAtom(productInstanceFormProcessingAtom);
  const formState = useAtomValue(productInstanceFormAtom);

  const addMutation = useAddProductInstanceMutation();

  useEffect(() => {
    setFormState(DEFAULT_PRODUCT_INSTANCE_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addProductInstance = () => {
    if (!formState || addMutation.isPending) return;

    setIsProcessing(true);
    addMutation.mutate(
      { productId: parent_product.id, form: formState },
      {
        onSuccess: () => {
          enqueueSnackbar(`Added ${formState.displayName}.`);
        },
        onError: (error: unknown) => {
          enqueueSnackbar(
            `Unable to add product instance: ${formState.displayName}. Got error ${JSON.stringify(error)}`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          setIsProcessing(false);
          onCloseCallback();
        },
      },
    );
  };

  if (!formState) return null;

  return (
    <ProductInstanceActionContainer
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addProductInstance}
      parent_product={parent_product}
    />
  );
};

export default ProductInstanceAddContainer;
