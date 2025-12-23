import { useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Add, Delete } from '@mui/icons-material';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import type {
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridRowOrderChangeParams,
  GridRowParams,
} from '@mui/x-data-grid-premium';
import { DataGridPremium, useGridApiRef } from '@mui/x-data-grid-premium';

import { type IProduct } from '@wcp/wario-shared/types';
import type { useCatalogSelectors } from '@wcp/wario-ux-shared/query';

import { productInstancesDirtyAtom } from '@/atoms/forms/productFormAtoms';
import {
  DEFAULT_PRODUCT_INSTANCE_FORM,
  fromProductInstanceEntity,
  productInstanceExpandedFamily,
  productInstanceFormFamily,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductInstanceContainer } from './product_instance.component';

type UncommittedIProduct = Omit<IProduct, 'id' | 'instances'>;

interface ProductInstanceRow {
  id: string;
  isBase: boolean;
}

/** Cell to show instance name with POS name if different - reads from atom for reactivity */
const InstanceNameCell = ({ instanceId }: { instanceId: string }) => {
  const form = useAtomValue(productInstanceFormFamily(instanceId));
  const displayName = form?.displayName || 'Unnamed';
  const posName = form?.posName || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <span>{displayName}</span>
      {posName && posName !== displayName && <span style={{ fontSize: '0.75rem', color: 'gray' }}>POS: {posName}</span>}
    </Box>
  );
};

/** Detail panel content - shows the ProductInstanceContainer */
const DetailPanelContent = ({
  instanceId,
  parentProduct,
}: {
  instanceId: string;
  parentProduct: UncommittedIProduct;
}) => {
  const formAtom = useMemo(() => productInstanceFormFamily(instanceId), [instanceId]);
  return <ProductInstanceContainer parent_product={parentProduct} formAtom={formAtom} />;
};

export interface ProductInstancesDataGridProps {
  instanceIds: string[];
  setInstanceIds: React.Dispatch<React.SetStateAction<string[]>>;
  parentProduct: UncommittedIProduct;
  catalogSelectors: NonNullable<ReturnType<typeof useCatalogSelectors>>;
}

export const ProductInstancesDataGrid = ({
  instanceIds,
  setInstanceIds,
  parentProduct,
  catalogSelectors,
}: ProductInstancesDataGridProps) => {
  const store = useStore();
  const apiRef = useGridApiRef();
  const [expandedRowIds, setExpandedRowIds] = useState<Set<GridRowId>>(new Set());

  // Initialize forms for all instances
  useEffect(() => {
    instanceIds.forEach((id) => {
      if (!id.startsWith('temp_')) {
        const existing = store.get(productInstanceFormFamily(id));
        if (!existing) {
          const entity = catalogSelectors.productInstance(id);
          store.set(productInstanceFormFamily(id), fromProductInstanceEntity(entity));
        }
      }
    });
  }, [instanceIds, catalogSelectors, store]);

  // Build rows
  const rows: ProductInstanceRow[] = useMemo(
    () =>
      instanceIds.map((id, index) => ({
        id,
        isBase: index === 0,
      })),
    [instanceIds],
  );

  const handleRemoveVariation = useCallback(
    (instanceId: string) => {
      // Only allow removing uncommitted (temp_) variations
      if (!instanceId.startsWith('temp_')) return;

      // Remove from instance IDs
      setInstanceIds((prev) => prev.filter((id) => id !== instanceId));

      // Cleanup form atoms
      productInstanceFormFamily.remove(instanceId);
      productInstanceExpandedFamily.remove(instanceId);

      // Remove from expanded rows
      setExpandedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(instanceId);
        return next;
      });
    },
    [setInstanceIds],
  );

  const columns: GridColDef<ProductInstanceRow>[] = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'Instance',
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<ProductInstanceRow>) => (
          <InstanceNameCell instanceId={params.row.id} />
        ),
      },
      {
        field: 'isBase',
        headerName: '',
        width: 80,
        renderCell: (params: GridRenderCellParams<ProductInstanceRow>) =>
          params.row.isBase ? (
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.75rem',
              }}
            >
              BASE
            </Box>
          ) : null,
      },
      {
        field: 'actions',
        headerName: '',
        width: 50,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ProductInstanceRow>) =>
          params.row.id.startsWith('temp_') ? (
            <Tooltip title="Remove new variation">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveVariation(params.row.id);
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null,
      },
    ],
    [handleRemoveVariation],
  );

  const handleDetailPanelExpandedRowIdsChange = useCallback((ids: Set<GridRowId>) => {
    setExpandedRowIds(ids);
  }, []);

  const getDetailPanelContent = useCallback(
    (params: GridRowParams<ProductInstanceRow>) => (
      <Box sx={{ p: 2 }}>
        <DetailPanelContent instanceId={params.row.id} parentProduct={parentProduct} />
      </Box>
    ),
    [parentProduct],
  );

  const handleAddVariation = useCallback(() => {
    const tempId = `temp_${String(Date.now())}`;
    store.set(productInstanceFormFamily(tempId), { ...DEFAULT_PRODUCT_INSTANCE_FORM });
    store.set(productInstanceExpandedFamily(tempId), true);
    store.set(productInstancesDirtyAtom, true);
    setInstanceIds((prev) => [...prev, tempId]);
    // Expand the new row
    setExpandedRowIds((prev) => new Set(prev).add(tempId));
  }, [store, setInstanceIds]);

  const handleRowClick = useCallback(
    (params: GridRowParams<ProductInstanceRow>) => {
      const newExpanded = new Set(expandedRowIds);
      if (newExpanded.has(params.id)) {
        newExpanded.delete(params.id);
      } else {
        newExpanded.add(params.id);
      }
      setExpandedRowIds(newExpanded);
    },
    [expandedRowIds],
  );

  // Handle row reorder
  const handleRowOrderChange = useCallback(
    (params: GridRowOrderChangeParams) => {
      const newInstanceIds = [...instanceIds];
      const [moved] = newInstanceIds.splice(params.oldIndex, 1);
      newInstanceIds.splice(params.targetIndex, 0, moved);
      setInstanceIds(newInstanceIds);
      store.set(productInstancesDirtyAtom, true);
    },
    [instanceIds, setInstanceIds, store],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ minHeight: 200 }}>
        <DataGridPremium
          showToolbar={false}
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          rowReordering={instanceIds.length > 1}
          onRowOrderChange={handleRowOrderChange}
          disableRowSelectionOnClick
          hideFooter
          getDetailPanelContent={getDetailPanelContent}
          getDetailPanelHeight={() => 'auto'}
          detailPanelExpandedRowIds={expandedRowIds}
          onDetailPanelExpandedRowIdsChange={handleDetailPanelExpandedRowIdsChange}
          onRowClick={handleRowClick}
          sx={{
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
            },
          }}
        />
      </Box>
      <Button startIcon={<Add />} onClick={handleAddVariation} fullWidth variant="outlined">
        Add Variation
      </Button>
    </Box>
  );
};
