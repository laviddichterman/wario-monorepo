import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { IProductInstanceFunction } from '@wcp/wario-shared';
import { useProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import { useEditProductInstanceFunctionMutation } from '@/hooks/useProductInstanceFunctionMutations';

import {
  fromProductInstanceFunctionEntity,
  productInstanceFunctionFormAtom,
  useProductInstanceFunctionForm,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

import ProductInstanceFunctionFormComponent from './product_instance_function.component';

interface ProductInstanceFunctionEditContainerProps {
  pifId: string;
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionEditContainer = ({
  pifId,
  onCloseCallback,
}: ProductInstanceFunctionEditContainerProps) => {
  const productInstanceFunction = useProductInstanceFunctionById(pifId);

  if (!productInstanceFunction) {
    return null;
  }

  return (
    <ProductInstanceFunctionEditContainerInner
      productInstanceFunction={productInstanceFunction}
      onCloseCallback={onCloseCallback}
    />
  );
};

const ProductInstanceFunctionEditContainerInner = ({
  productInstanceFunction,
  onCloseCallback,
}: {
  productInstanceFunction: IProductInstanceFunction;
  onCloseCallback: VoidFunction;
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const editMutation = useEditProductInstanceFunctionMutation();

  const setForm = useSetAtom(productInstanceFunctionFormAtom);
  const { form, isValid } = useProductInstanceFunctionForm();

  // Initialize form on mount with entity data
  useEffect(() => {
    setForm(fromProductInstanceFunctionEntity(productInstanceFunction));
    return () => {
      setForm(null);
    };
  }, [productInstanceFunction, setForm]);

  const editProductInstanceFunction = () => {
    if (!form || !isValid || editMutation.isPending) return;

    editMutation.mutate(
      { id: productInstanceFunction.id, form },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated product instance function: ${form.functionName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to edit product instance function: ${form.functionName}. Got error ${JSON.stringify(error, null, 2)}`,
            { variant: 'error' },
          );
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  if (!form) return null;

  return (
    <ProductInstanceFunctionFormComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={editProductInstanceFunction}
      isProcessing={editMutation.isPending}
    />
  );
};

export default ProductInstanceFunctionEditContainer;
