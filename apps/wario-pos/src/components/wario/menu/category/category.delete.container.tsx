import { useSnackbar } from 'notistack';
import { useState } from 'react';

import { Grid } from '@mui/material';

import type { ICategory } from '@wcp/wario-shared';
import { useCategoryById } from '@wcp/wario-ux-shared/query';

import { useDeleteCategoryMutation } from '@/hooks/useCategoryMutations';

import { createNullGuard } from '@/components/wario/catalog-null-guard';
import { ToggleBooleanPropertyComponent } from '@/components/wario/property-components/ToggleBooleanPropertyComponent';

import ElementDeleteComponent from '../element.delete.component';

const CategoryNullGuard = createNullGuard(useCategoryById);
export interface CategoryDeleteProps {
  categoryId: string | null;
  onCloseCallback: VoidFunction;
}

const CategoryDeleteContainer = ({ categoryId, onCloseCallback }: CategoryDeleteProps) => {
  return (
    <CategoryNullGuard
      id={categoryId}
      child={(category: ICategory) => (
        <CategoryDeleteContainerInner category={category} onCloseCallback={onCloseCallback} />
      )}
    />
  );
};

interface CategoryDeleteContainerProps {
  category: ICategory;
  onCloseCallback: VoidFunction;
}

const CategoryDeleteContainerInner = ({ category, onCloseCallback }: CategoryDeleteContainerProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [deleteContainedProducts, setDeleteContainedProducts] = useState(false);

  const deleteMutation = useDeleteCategoryMutation();

  const deleteCategory = () => {
    if (deleteMutation.isPending) return;

    deleteMutation.mutate(
      { id: category.id, deleteContainedProducts },
      {
        onSuccess: () => {
          enqueueSnackbar(
            `Deleted category: ${category.name}${deleteContainedProducts ? ' and contained products' : ''}.`,
          );
        },
        onError: (error) => {
          enqueueSnackbar(`Unable to delete category: ${category.name}. Got error ${JSON.stringify(error, null, 2)}`, {
            variant: 'error',
          });
          console.error(error);
        },
        onSettled: () => {
          onCloseCallback();
        },
      },
    );
  };

  return (
    <ElementDeleteComponent
      onCloseCallback={onCloseCallback}
      onConfirmClick={deleteCategory}
      name={category.name}
      isProcessing={deleteMutation.isPending}
      additionalBody={
        <Grid size={12}>
          <ToggleBooleanPropertyComponent
            disabled={deleteMutation.isPending}
            label="Delete Contained Products"
            setValue={setDeleteContainedProducts}
            value={deleteContainedProducts}
          />
        </Grid>
      }
    />
  );
};

export default CategoryDeleteContainer;
