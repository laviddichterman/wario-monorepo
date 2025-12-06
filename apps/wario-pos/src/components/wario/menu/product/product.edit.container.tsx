import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IProduct } from '@wcp/wario-shared';
import { useBaseProductNameByProductId, useValueFromProductEntryById } from '@wcp/wario-ux-shared/query';

import { useEditProductMutation } from '@/hooks/useProductMutations';

import { fromProductEntity, productFormAtom, productFormProcessingAtom } from '@/atoms/forms/productFormAtoms';

import { ProductComponent } from './product.component';

export interface ProductEditContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}

const ProductEditContainer = ({ product_id, onCloseCallback }: ProductEditContainerProps) => {
  const productName = useBaseProductNameByProductId(product_id);
  const product = useValueFromProductEntryById(product_id, 'product');

  if (!product || !productName) {
    return null;
  }

  return <ProductEditContainerInner product={product} productName={productName} onCloseCallback={onCloseCallback} />;
};

interface InnerProps {
  product: IProduct;
  productName: string;
  onCloseCallback: VoidFunction;
}

const ProductEditContainerInner = ({ product, productName, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setProductForm = useSetAtom(productFormAtom);
  const setIsProcessing = useSetAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);

  const editMutation = useEditProductMutation();

  useEffect(() => {
    setProductForm(fromProductEntity(product));
    return () => {
      setProductForm(null);
    };
  }, [product, setProductForm]);

  const editProduct = () => {
    if (!productForm || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      { id: product.id, form: productForm },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated ${productName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to update ${productName}. Got error: ${JSON.stringify(error, null, 2)}.`, {
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

  if (!productForm) return null;

  return <ProductComponent confirmText="Save" onCloseCallback={onCloseCallback} onConfirmClick={editProduct} />;
};

export default ProductEditContainer;
