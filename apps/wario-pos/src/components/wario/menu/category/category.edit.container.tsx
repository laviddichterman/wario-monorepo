import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { Button } from '@mui/material';

import type { ICategory } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCategoryById } from '@wcp/wario-ux-shared/query';

import { useEditCategoryMutation } from '@/hooks/useCategoryMutations';

import { toast } from '@/components/snackbar';
import { createNullGuard } from '@/components/wario/catalog-null-guard';

import {
  categoryFormAtom,
  categoryFormDirtyFieldsAtom,
  categoryFormProcessingAtom,
  fromCategoryEntity,
} from '@/atoms/forms/categoryFormAtoms';

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
  const setFormState = useSetAtom(categoryFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(categoryFormProcessingAtom);
  const formState = useAtomValue(categoryFormAtom);
  const [dirtyFields, setDirtyFields] = useAtom(categoryFormDirtyFieldsAtom);

  const editMutation = useEditCategoryMutation();

  // Initialize form from existing entity and reset dirty fields
  useEffect(() => {
    setFormState(fromCategoryEntity(category));
    setDirtyFields(new Set());
    return () => {
      setFormState(null);
      setDirtyFields(new Set());
    };
  }, [category, setFormState, setDirtyFields]);

  const editCategory = () => {
    if (!formState || editMutation.isPending) return;

    setIsProcessing(true);
    editMutation.mutate(
      { id: category.id, form: formState, dirtyFields },
      {
        onSuccess: () => {
          toast.success(`Updated category: ${formState.name}.`);
        },
        onError: (error) => {
          toast.error(`Unable to update category: ${formState.name}. Got error ${JSON.stringify(error, null, 2)}`);
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
        <Button onClick={editCategory} disabled={isProcessing || dirtyFields.size === 0} variant="contained">
          Save
        </Button>
      </AppDialog.Actions>
    </AppDialog.Root>
  );
};

export default CategoryEditContainer;
