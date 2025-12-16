import { useCallback } from 'react';

import { CategoryIdHasCycleIfChildOfProposedCategoryId } from '@wcp/wario-shared/logic';
import type { ICatalogSelectors } from '@wcp/wario-shared/types';

import { useCatalogSelectors } from './useCatalogQuery';

/**
 * Hook to check if a category has a cycle if it were to be made a child of another category.
 * useful for excluding categories from being added as children of themselves or their descendants.
 */

export const useCategoryIdHasCycle = () => {
  const { category } = useCatalogSelectors() as ICatalogSelectors;

  const hasCycle = useCallback(
    (categoryId: string, proposedCategoryId: string) =>
      CategoryIdHasCycleIfChildOfProposedCategoryId(categoryId, proposedCategoryId, category),
    [category],
  );

  return hasCycle;
};
