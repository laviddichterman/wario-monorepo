import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

import { Delete } from '@mui/icons-material';
import { Autocomplete, Box, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef, GridRenderCellParams, GridRowOrderChangeParams } from '@mui/x-data-grid-premium';
import { DataGridPremium } from '@mui/x-data-grid-premium';

import { useCatalogQuery, useProductById } from '@wcp/wario-ux-shared/query';

import {
  categoryFormAtom,
  categoryFormDirtyFieldsAtom,
  categoryFormProcessingAtom,
} from '@/atoms/forms/categoryFormAtoms';

// Row type represents a product in this category
interface ProductRow {
  id: string; // product ID
}

/** Fetches data for a single product row with variations indicator */
const ProductNameCell = ({ productId }: { productId: string }) => {
  const product = useProductById(productId);
  const { data: catalog } = useCatalogQuery();

  const { displayName, variationCount } = useMemo(() => {
    if (!product || !catalog) return { displayName: 'Loading...', variationCount: 0 };
    const baseInstanceId = product.instances[0];
    if (!baseInstanceId) return { displayName: 'UNKNOWN', variationCount: 0 };
    const baseInstance = catalog.productInstances[baseInstanceId];
    return {
      displayName: baseInstance.displayName,
      variationCount: product.instances.length,
    };
  }, [product, catalog]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Typography variant="body2">{displayName}</Typography>
      {variationCount > 1 && (
        <Typography variant="caption" color="text.secondary">
          +{(variationCount - 1).toString()} variation{variationCount > 2 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
};

export const CategoryProductList = () => {
  const [form, setForm] = useAtom(categoryFormAtom);
  const isProcessing = useAtomValue(categoryFormProcessingAtom);
  const setDirtyFields = useSetAtom(categoryFormDirtyFieldsAtom);

  const { data: catalog } = useCatalogQuery();

  // Local state for the add-product autocomplete
  const [addProductValue, setAddProductValue] = useState<string | null>(null);

  // Products currently in the category (memoized for stable reference)
  const productIds = useMemo(() => form?.products ?? [], [form?.products]);

  // Compute available products (exclude already-added)
  const availableProducts = useMemo(() => {
    if (!catalog) return [];
    const inCategory = new Set(productIds);
    return Object.keys(catalog.products).filter((id) => !inCategory.has(id));
  }, [catalog, productIds]);

  // Get display name for autocomplete
  const getProductLabel = useCallback(
    (productId: string) => {
      if (!catalog) return productId;
      const product = catalog.products[productId];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!product) return productId;
      const baseInstanceId = product.instances[0];
      if (!baseInstanceId) return productId;
      const baseInstance = catalog.productInstances[baseInstanceId];
      return baseInstance.displayName;
    },
    [catalog],
  );

  // Build rows from product IDs - use just ID for stable row identity
  const rows: ProductRow[] = useMemo(() => productIds.map((id) => ({ id })), [productIds]);

  // Handle row reorder
  const handleRowOrderChange = useCallback(
    (params: GridRowOrderChangeParams) => {
      if (!form) return;
      const newProducts = [...productIds];
      const [moved] = newProducts.splice(params.oldIndex, 1);
      newProducts.splice(params.targetIndex, 0, moved);
      setForm({ ...form, products: newProducts });
      setDirtyFields((prev) => new Set(prev).add('products'));
    },
    [form, productIds, setForm, setDirtyFields],
  );

  // Handle remove product
  const handleRemoveProduct = useCallback(
    (productId: string) => {
      if (!form) return;
      const newProducts = productIds.filter((id) => id !== productId);
      setForm({ ...form, products: newProducts });
      setDirtyFields((prev) => new Set(prev).add('products'));
    },
    [form, productIds, setForm, setDirtyFields],
  );

  const columns: GridColDef<ProductRow>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Product',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ProductRow>) => <ProductNameCell productId={params.row.id} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 60,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ProductRow>) => (
          <Tooltip title="Remove from category">
            <IconButton
              size="small"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveProduct(params.row.id);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [isProcessing, handleRemoveProduct],
  );

  if (!form) return null;

  return (
    <Box>
      {/* Add Product Row */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Autocomplete
            fullWidth
            size="small"
            options={availableProducts}
            value={addProductValue}
            onChange={(_, value) => {
              if (value) {
                const newProducts = [...productIds, value];
                setForm({ ...form, products: newProducts });
                setDirtyFields((prev) => new Set(prev).add('products'));
                setAddProductValue(null);
              }
            }}
            getOptionLabel={getProductLabel}
            filterOptions={(options, state) => {
              const inputValue = state.inputValue.toLowerCase();
              if (!inputValue) return options;
              return options.filter((option) => getProductLabel(option).toLowerCase().includes(inputValue));
            }}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                {getProductLabel(option)}
              </li>
            )}
            renderInput={(params) => <TextField {...params} placeholder="Select a product to add..." />}
            disabled={isProcessing}
          />
        </Box>
      </Paper>

      {/* Product List */}
      {rows.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <DataGridPremium
            rows={rows}
            columns={columns}
            rowReordering
            onRowOrderChange={handleRowOrderChange}
            disableRowSelectionOnClick
            hideFooter
            showToolbar={false}
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
          No products in this category. Use the autocomplete above to add products.
        </Typography>
      )}
    </Box>
  );
};
