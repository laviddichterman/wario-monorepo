import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { Button } from '@mui/material';

import { AppDialog } from '@wcp/wario-ux-shared/containers';

import { useAddCategoryMutation } from '@/hooks/useCategoryMutations';

import { categoryFormAtom, categoryFormProcessingAtom, DEFAULT_CATEGORY_FORM } from '@/atoms/forms/categoryFormAtoms';

import { CategoryFormBody } from './category.component';

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

  return (
    <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
      <AppDialog.Header onClose={onCloseCallback} title="Add Category" />
      <AppDialog.Content>
        <CategoryFormBody />
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onCloseCallback} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={addCategory} disabled={isProcessing} variant="contained">
          Add
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
};

export default CategoryAddContainer;
