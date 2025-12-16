import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

import { Delete } from '@mui/icons-material';
import { Autocomplete, Box, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef, GridRenderCellParams, GridRowOrderChangeParams } from '@mui/x-data-grid-premium';
import { DataGridPremium } from '@mui/x-data-grid-premium';

import type { ICatalogSelectors } from '@wcp/wario-shared/types';
import { useCatalogSelectors, useCategoryIdHasCycle, useCategoryIds } from '@wcp/wario-ux-shared/query';

import {
  categoryFormAtom,
  categoryFormDirtyFieldsAtom,
  categoryFormProcessingAtom,
} from '@/atoms/forms/categoryFormAtoms';

// Row type represents a child category
interface ChildRow {
  id: string;
}

interface CategoryChildrenListProps {
  excludeCategoryId?: string;
}

/** Displays category name for a row */
const CategoryNameCell = ({ categoryId }: { categoryId: string }) => {
  const { category } = useCatalogSelectors() as ICatalogSelectors;
  const cat = category(categoryId);
  return <Typography variant="body2">{cat?.name ?? 'Unknown'}</Typography>;
};

export const CategoryChildrenList = ({ excludeCategoryId }: CategoryChildrenListProps) => {
  const [form, setForm] = useAtom(categoryFormAtom);
  const isProcessing = useAtomValue(categoryFormProcessingAtom);
  const setDirtyFields = useSetAtom(categoryFormDirtyFieldsAtom);

  const allCategoryIds = useCategoryIds();
  const { category } = useCatalogSelectors() as ICatalogSelectors;
  const categoryIdHasCycle = useCategoryIdHasCycle();

  // Local state for the add-category autocomplete
  const [addCategoryValue, setAddCategoryValue] = useState<string | null>(null);

  // Children currently in the category (memoized for stable reference)
  const childrenIds = useMemo(() => form?.children ?? [], [form?.children]);

  // Filter out current category and already-added children
  const availableCategories = useMemo(() => {
    const inChildren = new Set(childrenIds);
    return allCategoryIds.filter((id) => {
      if (id === excludeCategoryId || inChildren.has(id)) return false;
      if (excludeCategoryId && categoryIdHasCycle(id, excludeCategoryId)) {
        return false;
      }
      return true;
    });
  }, [allCategoryIds, childrenIds, excludeCategoryId, categoryIdHasCycle]);

  // Get display name for autocomplete
  const getCategoryLabel = useCallback(
    (categoryId: string) => {
      const cat = category(categoryId);
      return cat?.name ?? categoryId;
    },
    [category],
  );

  // Build rows from children IDs
  const rows: ChildRow[] = useMemo(() => childrenIds.map((id) => ({ id })), [childrenIds]);

  // Handle row reorder
  const handleRowOrderChange = useCallback(
    (params: GridRowOrderChangeParams) => {
      if (!form) return;
      const newChildren = [...childrenIds];
      const [moved] = newChildren.splice(params.oldIndex, 1);
      newChildren.splice(params.targetIndex, 0, moved);
      setForm({ ...form, children: newChildren });
      setDirtyFields((prev) => new Set(prev).add('children'));
    },
    [form, childrenIds, setForm, setDirtyFields],
  );

  // Handle remove child
  const handleRemoveChild = useCallback(
    (categoryId: string) => {
      if (!form) return;
      const newChildren = childrenIds.filter((id) => id !== categoryId);
      setForm({ ...form, children: newChildren });
      setDirtyFields((prev) => new Set(prev).add('children'));
    },
    [form, childrenIds, setForm, setDirtyFields],
  );

  const columns: GridColDef<ChildRow>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Category',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ChildRow>) => <CategoryNameCell categoryId={params.row.id} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 60,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ChildRow>) => (
          <Tooltip title="Remove child category">
            <IconButton
              size="small"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveChild(params.row.id);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [isProcessing, handleRemoveChild],
  );

  if (!form) return null;

  return (
    <Box>
      {/* Add Category Row */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            fullWidth
            size="small"
            options={availableCategories}
            value={addCategoryValue}
            onChange={(_, value) => {
              if (value) {
                const newChildren = [...childrenIds, value];
                setForm({ ...form, children: newChildren });
                setDirtyFields((prev) => new Set(prev).add('children'));
                setAddCategoryValue(null);
              }
            }}
            getOptionLabel={getCategoryLabel}
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase();
              if (!inputValue) return options;
              return options.filter((option) => getCategoryLabel(option).toLowerCase().includes(inputValue));
            }}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                {getCategoryLabel(option)}
              </li>
            )}
            renderInput={(params) => <TextField {...params} placeholder="Select a child category to add..." />}
            disabled={isProcessing}
          />
        </Box>
      </Paper>

      {/* Children List */}
      {rows.length > 0 ? (
        <Box sx={{ height: 200 }}>
          <DataGridPremium
            showToolbar={false}
            rows={rows}
            columns={columns}
            rowReordering
            onRowOrderChange={handleRowOrderChange}
            disableRowSelectionOnClick
            hideFooter
            getRowId={(row) => row.id}
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                display: 'none',
              },
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No child categories. Use the autocomplete above to add children.
        </Typography>
      )}
    </Box>
  );
};
