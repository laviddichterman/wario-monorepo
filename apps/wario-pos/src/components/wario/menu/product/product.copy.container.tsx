import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Button, Checkbox, Chip, Tab, Typography } from '@mui/material';
import type { GridColDef, GridRenderCellParams, GridRowOrderChangeParams } from '@mui/x-data-grid-premium';
import { DataGridPremium } from '@mui/x-data-grid-premium';

import { type CreateIProductInstanceRequest, type CreateIProductRequest, type IProduct } from '@wcp/wario-shared/types';
import { AppDialog } from '@wcp/wario-ux-shared/containers';
import { useCatalogSelectors, useProductById } from '@wcp/wario-ux-shared/query';

import { useAddProductMutation } from '@/hooks/useProductMutations';

import { toast } from '@/components/snackbar';

import {
  fromProductEntity,
  productFormAtom,
  productFormProcessingAtom,
  toProductApiBody,
} from '@/atoms/forms/productFormAtoms';
import {
  fromProductInstanceEntity,
  productInstanceFormFamily,
  toProductInstanceApiBody,
} from '@/atoms/forms/productInstanceFormAtoms';

import { ProductFormBody } from './product.component';

export interface ProductCopyContainerProps {
  product_id: string;
  onCloseCallback: VoidFunction;
}

export const ProductCopyContainer = ({ product_id, onCloseCallback }: ProductCopyContainerProps) => {
  const product = useProductById(product_id);

  if (!product) {
    return null;
  }

  return <ProductCopyContainerContent product={product} onCloseCallback={onCloseCallback} />;
};

const ProductCopyContainerContent = ({
  product,
  onCloseCallback,
}: {
  product: IProduct;
  onCloseCallback: VoidFunction;
}) => {
  const catalogSelectors = useCatalogSelectors();

  if (!catalogSelectors) return null;

  return <ProductCopyForm product={product} catalogSelectors={catalogSelectors} onCloseCallback={onCloseCallback} />;
};

interface ProductCopyFormProps {
  product: IProduct;
  catalogSelectors: NonNullable<ReturnType<typeof useCatalogSelectors>>;
  onCloseCallback: VoidFunction;
}

interface InstanceRow {
  id: string;
  displayName: string;
  include: boolean;
}

const ProductCopyForm = ({ product, catalogSelectors, onCloseCallback }: ProductCopyFormProps) => {
  const addMutation = useAddProductMutation();

  const setProductForm = useSetAtom(productFormAtom);
  const [isProcessing, setIsProcessing] = useAtom(productFormProcessingAtom);
  const productForm = useAtomValue(productFormAtom);

  // State for ordered instance rows (first is base)
  const [rows, setRows] = useState<InstanceRow[]>(() =>
    product.instances.map((id) => {
      const instance = catalogSelectors.productInstance(id);
      return {
        id,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        displayName: instance?.displayName ?? 'Unknown',
        include: true, // Default all to included
      };
    }),
  );

  // Derived atom to read all instance forms for submission
  const instanceIds = product.instances;
  const allInstancesAtom = useMemo(
    () =>
      atom((get) =>
        instanceIds.map((id) => ({
          id,
          form: get(productInstanceFormFamily(id)),
        })),
      ),
    [instanceIds],
  );
  const allInstances = useAtomValue(allInstancesAtom);

  const [activeTab, setActiveTab] = useState('settings');

  // Initialize Atoms
  useEffect(() => {
    // 1. Base Product Form
    setProductForm(fromProductEntity(product));

    // 2. Initialize instance form atoms
    product.instances.forEach((id) => {
      const instance = catalogSelectors.productInstance(id);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (instance) {
        productInstanceFormFamily(id);
        // Set initial value using the store
        const formFamily = productInstanceFormFamily(id);
        formFamily.init = fromProductInstanceEntity(instance);
      }
    });

    return () => {
      setProductForm(null);
      // Cleanup family atoms
      product.instances.forEach((id) => {
        productInstanceFormFamily.remove(id);
      });
    };
  }, [product, catalogSelectors, setProductForm]);

  // Handle row reorder
  const handleRowOrderChange = useCallback((params: GridRowOrderChangeParams) => {
    setRows((prev) => {
      const newRows = [...prev];
      const [movedRow] = newRows.splice(params.oldIndex, 1);
      newRows.splice(params.targetIndex, 0, movedRow);
      return newRows;
    });
  }, []);

  // Handle include toggle
  const handleToggleInclude = useCallback((id: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, include: !row.include } : row)));
  }, []);

  const columns: GridColDef<InstanceRow>[] = useMemo(
    () => [
      {
        field: 'include',
        headerName: 'Include',
        width: 80,
        renderCell: (params: GridRenderCellParams<InstanceRow>) => {
          const isBase = rows.findIndex((r) => r.id === params.row.id) === 0;
          return (
            <Checkbox
              checked={params.row.include}
              disabled={isBase} // Base must always be included
              onChange={() => {
                handleToggleInclude(params.row.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          );
        },
      },
      {
        field: 'displayName',
        headerName: 'Instance Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'base',
        headerName: '',
        width: 80,
        sortable: false,
        renderCell: (params: GridRenderCellParams<InstanceRow>) => {
          const isBase = rows.findIndex((r) => r.id === params.row.id) === 0;
          return isBase ? <Chip label="BASE" color="primary" size="small" /> : null;
        },
      },
    ],
    [rows, handleToggleInclude],
  );

  const copyProduct = () => {
    if (isProcessing || !productForm) return;

    setIsProcessing(true);

    // Build instances in order, filtering by include flag
    const includedRows = rows.filter((row) => row.include);

    if (includedRows.length === 0) {
      toast.error('At least one instance must be included');
      setIsProcessing(false);
      return;
    }

    const batchInstances: CreateIProductInstanceRequest[] = [];
    for (const row of includedRows) {
      const instanceData = allInstances.find((i) => i.id === row.id);
      if (instanceData?.form) {
        batchInstances.push(toProductInstanceApiBody(instanceData.form));
      } else {
        // Fallback: use original instance data from catalog
        const originalInstance = catalogSelectors.productInstance(row.id);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (originalInstance) {
          // Use the proper conversion function
          batchInstances.push(toProductInstanceApiBody(fromProductInstanceEntity(originalInstance)));
        }
      }
    }

    const productBody = toProductApiBody(productForm);

    // CreateIProductRequest expects a flat structure with instances included
    const batchRequest: CreateIProductRequest = {
      ...productBody,
      instances: batchInstances,
    };

    addMutation.mutate(batchRequest, {
      onSuccess: () => {
        toast.success(`Copied product with ${batchInstances.length.toString()} instance(s).`);
        onCloseCallback();
      },
      onError: (e) => {
        console.error(e);
        toast.error(`Error copying product: ${e instanceof Error ? e.message : 'Unknown error'}`);
      },
      onSettled: () => {
        setIsProcessing(false);
      },
    });
  };

  if (!productForm) return null;

  return (
    <TabContext value={activeTab}>
      <AppDialog.Root open onClose={onCloseCallback} maxWidth="md" fullWidth>
        <AppDialog.Header onClose={onCloseCallback} title="Copy Product">
          <TabList
            onChange={(_e, v: string) => {
              setActiveTab(v);
            }}
            aria-label="Product copy tabs"
          >
            <Tab label="Settings" value="settings" />
            <Tab label="Variations" value="variations" />
          </TabList>
        </AppDialog.Header>
        <AppDialog.Content>
          <TabPanel value="settings" sx={{ p: 0, pt: 2 }}>
            <ProductFormBody />
          </TabPanel>
          <TabPanel value="variations" sx={{ p: 0, pt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Drag rows to reorder. The first row will be the base product instance.
              </Typography>
            </Box>
            <Box sx={{ height: 400 }}>
              <DataGridPremium
                rows={rows}
                columns={columns}
                rowReordering
                onRowOrderChange={handleRowOrderChange}
                disableRowSelectionOnClick
                hideFooter
                getRowId={(row) => row.id}
                sx={{
                  '& .MuiDataGrid-row:first-of-type': {
                    backgroundColor: 'action.selected',
                  },
                }}
              />
            </Box>
          </TabPanel>
        </AppDialog.Content>
        <AppDialog.Actions>
          <Button onClick={onCloseCallback} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              copyProduct();
            }}
            disabled={isProcessing}
            variant="contained"
          >
            Copy
          </Button>
        </AppDialog.Actions>
      </AppDialog.Root>
    </TabContext>
  );
};
