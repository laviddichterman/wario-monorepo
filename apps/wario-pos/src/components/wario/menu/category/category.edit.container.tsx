import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import { Button } from '@mui/material';

import type { ICategory } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCategoryById } from '@wcp/wario-ux-shared/query';

import { useEditCategoryMutation } from '@/hooks/useCategoryMutations';

import { createNullGuard } from '@/components/wario/catalog-null-guard';

import { categoryFormAtom, categoryFormProcessingAtom, fromCategoryEntity } from '@/atoms/forms/categoryFormAtoms';

import { CategoryFormBody } from './category.component';

const CategoryNullGuard = createNullGuard(useCategoryById);
export interface CategoryEditProps {
  categoryId: string | null;
  onCloseCallback: VoidFunction;
}

const CategoryEditContainer = ({ categoryId, onCloseCallback }: CategoryEditProps) => {
  return (
    <CategoryNullGuard
      id={categoryId}
      child={(category: ICategory) => (
        <CategoryEditContainerInner category={category} onCloseCallback={onCloseCallback} />
      )}
    />
  );
};

interface InnerProps {
  category: ICategory;
  onCloseCallback: VoidFunction;
}

const CategoryEditContainerInner = ({ category, onCloseCallback }: InnerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  const setFormState = useSetAtom(categoryFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(categoryFormProcessingAtom);
  const formState = useAtomValue(categoryFormAtom);

  const editMutation = useEditCategoryMutation();

  // Initialize form from existing entity
  useEffect(() => {
    setFormState(fromCategoryEntity(category));
    return () => {
      setFormState(null);
    };
  }, [category, setFormState]);

  const editCategory = () => {
    if (!formState || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      { id: category.id, form: formState },
      {
        onSuccess: () => {
          enqueueSnackbar(`Updated category: ${formState.name}.`);
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to update category: ${formState.name}. Got error ${JSON.stringify(error, null, 2)}`, {
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
    <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
      <AppDialog.Header onClose={onCloseCallback} title={`Edit ${formState.name}`} />
      <AppDialog.Content>
        <CategoryFormBody excludeCategoryId={category.id} />
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onClick={onCloseCallback} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={editCategory} disabled={isProcessing} variant="contained">
          Save
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
};

export default CategoryEditContainer;
