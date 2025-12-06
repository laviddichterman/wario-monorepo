import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { useAddCategoryMutation } from '@/hooks/useCategoryMutations';

import { categoryFormAtom, categoryFormProcessingAtom, DEFAULT_CATEGORY_FORM } from '@/atoms/forms/categoryFormAtoms';

import { CategoryComponent } from './category.component';

export interface CategoryAddContainerProps {
  onCloseCallback: VoidFunction;
}

const CategoryAddContainer = ({ onCloseCallback }: CategoryAddContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const setFormState = useSetAtom(categoryFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(categoryFormProcessingAtom);
  const formState = useAtomValue(categoryFormAtom);

  const addMutation = useAddCategoryMutation();

  useEffect(() => {
    setFormState(DEFAULT_CATEGORY_FORM);
    return () => {
      setFormState(null);
    };
  }, [setFormState]);

  const addCategory = () => {
    if (!formState || addMutation.isPending || isProcessing) return;

    setIsProcessing(true);
    addMutation.mutate(formState, {
      onSuccess: () => {
        enqueueSnackbar(`Added new category: ${formState.name}.`);
      },
      onError: (error) => {
        enqueueSnackbar(`Unable to add category: ${formState.name}. Got error: ${JSON.stringify(error, null, 2)}.`, {
          variant: 'error',
        });
        console.error(error);
      },
      onSettled: () => {
        setIsProcessing(false);
        onCloseCallback();
      },
    });
  };

  return <CategoryComponent confirmText="Add" onCloseCallback={onCloseCallback} onConfirmClick={addCategory} />;
};

export default CategoryAddContainer;
