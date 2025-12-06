import { useAtomValue, useSetAtom } from 'jotai';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

import type { ICategory } from '@wcp/wario-shared';
import { useValueFromCategoryEntryById } from '@wcp/wario-ux-shared/query';

import { useEditCategoryMutation } from '@/hooks/useCategoryMutations';

import { createNullGuard } from '@/components/wario/catalog-null-guard';

import { categoryFormAtom, categoryFormProcessingAtom, fromCategoryEntity } from '@/atoms/forms/categoryFormAtoms';

import { CategoryComponent } from './category.component';

const useCategoryById = (id: string | null) => useValueFromCategoryEntryById(id ?? '', 'category') ?? null;

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
  const setIsProcessing = useSetAtom(categoryFormProcessingAtom);
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

  return (
    <CategoryComponent
      confirmText="Save"
      onCloseCallback={onCloseCallback}
      onConfirmClick={editCategory}
      excludeCategoryId={category.id}
    />
  );
};

export default CategoryEditContainer;
