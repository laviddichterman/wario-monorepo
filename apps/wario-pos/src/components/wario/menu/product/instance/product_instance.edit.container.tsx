import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IProduct, IProductInstance } from '@wcp/wario-shared';
import { useProductInstanceById, useValueFromProductEntryById } from '@wcp/wario-ux-shared/query';

import { useEditProductInstanceMutation } from '@/hooks/useProductInstanceMutations';

import {
  fromProductInstanceEntity,
  productInstanceFormAtom,
  productInstanceFormProcessingAtom,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceActionContainer } from './product_instance.component';

interface ProductInstanceEditContainerProps {
  product_instance_id: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceEditContainer = ({ product_instance_id, onCloseCallback }: ProductInstanceEditContainerProps) => {
  const product_instance = useProductInstanceById(product_instance_id);
  const parentProductId = product_instance?.productId ?? '';
  const parent_product = useValueFromProductEntryById(parentProductId, 'product');

  if (!product_instance || !parent_product) {
    return null;
  }

  return (
    <ProductInstanceEditContainerInner
      product_instance={product_instance}
      parent_product={parent_product}
      onCloseCallback={onCloseCallback}
    />
  );
};

interface InnerProps {
  product_instance: IProductInstance;
  parent_product: IProduct;
  onCloseCallback: VoidFunction;
}

const ProductInstanceEditContainerInner = ({ product_instance, parent_product, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(productInstanceFormAtom);
  const setIsProcessing = useSetAtom(productInstanceFormProcessingAtom);
  const formState = useAtomValue(productInstanceFormAtom);

  const editMutation = useEditProductInstanceMutation();

  useEffect(() => {
    setFormState(fromProductInstanceEntity(product_instance));
    return () => {
      setFormState(null);
    };
  }, [setFormState, product_instance]);

  const editProductInstance = () => {
    if (!formState || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      {
        productId: parent_product.id,
        instanceId: product_instance.id,
        form: formState,
      },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated ${formState.displayName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to update ${formState.displayName}. Got error: ${JSON.stringify(error)}.`, {
            variant: 'error',
          });
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
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={editProductInstance}
      parent_product={parent_product}
    />
  );
};

export default ProductInstanceEditContainer;
