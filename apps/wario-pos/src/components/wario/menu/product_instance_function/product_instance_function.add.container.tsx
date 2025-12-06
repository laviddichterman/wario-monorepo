import { useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useAddProductInstanceFunctionMutation } from '@/hooks/useProductInstanceFunctionMutations';

import {
  DEFAULT_PRODUCT_INSTANCE_FUNCTION_FORM,
  productInstanceFunctionFormAtom,
  useProductInstanceFunctionForm,
} from '@/atoms/forms/productInstanceFunctionFormAtoms';

import ProductInstanceFunctionFormComponent from './product_instance_function.component';

interface ProductInstanceFunctionAddContainerProps {
  onCloseCallback: VoidFunction;
}

const ProductInstanceFunctionAddContainer = ({ onCloseCallback }: ProductInstanceFunctionAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const addMutation = useAddProductInstanceFunctionMutation();

  const setForm = useSetAtom(productInstanceFunctionFormAtom);
  const { form, isValid } = useProductInstanceFunctionForm();

  // Initialize form on mount
  useEffect(() => {
    setForm(DEFAULT_PRODUCT_INSTANCE_FUNCTION_FORM);
    return () => {
      setForm(null);
    };
  }, [setForm]);

  const addProductInstanceFunction = () => {
    if (!form || !isValid || addMutation.isPending) return;

    addMutation.mutate(
      { form },
      {
        onSuccess: () => {
          enqueueSnackbar(`Added product instance function: ${form.functionName}.`);
        },
        onError: (error) => {
          enqueueSnackbar(
            `Unable to add product instance function: ${form.functionName}. Got error ${JSON.stringify(error, null, 2)}`,
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
      confirmText="Add"
      onCloseCallback={onCloseCallback}
      onConfirmClick={addProductInstanceFunction}
      isProcessing={addMutation.isPending}
    />
  );
};

export default ProductInstanceFunctionAddContainer;
