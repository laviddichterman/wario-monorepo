import { format } from 'date-fns';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

import { AddBox, BedtimeOff, Cancel, CheckCircle, DeleteOutline, Edit, LibraryAdd, Search } from '@mui/icons-material';
import { Box, InputAdornment, TextField, Tooltip } from '@mui/material';
import type { GridRenderCellParams, GridRowId, GridRowParams } from '@mui/x-data-grid-premium';
import { GridActionsCellItem, useGridApiRef } from '@mui/x-data-grid-premium';

import { DISABLE_REASON, DisableDataCheck, type IProduct } from '@wcp/wario-shared/logic';
import { useCatalogQuery, useProductById, useServerTime } from '@wcp/wario-ux-shared/query';

import { useAuthContext } from '@/hooks/useAuthContext';
import { usePrinterGroupsMap } from '@/hooks/usePrinterGroupsQuery';

import {
  openProductCopyAtom,
  openProductDeleteAtom,
  openProductDisableAtom,
  openProductDisableUntilEodAtom,
  openProductEditAtom,
  openProductEnableAtom,
  openProductInstanceAddAtom,
} from '@/atoms/catalog';

import { TableWrapperComponent } from '../../table_wrapper.component';
import type { ToolbarAction } from '../../table_wrapper.component';

import ProductInstanceTableContainer from './product_instance_table.container';

type RowType = { id: string; disableData: ReturnType<typeof DisableDataCheck>; name: string };

const DisableDataToString = (disableData: ReturnType<typeof DisableDataCheck>) => {
  switch (disableData.enable) {
    case DISABLE_REASON.ENABLED: {
      return 'False';
    }
    case DISABLE_REASON.DISABLED_BLANKET: {
      return 'True';
    }
    case DISABLE_REASON.DISABLED_TIME: {
      return `${format(disableData.interval.start, 'MMMM dd, y hh:mm a')} to ${format(disableData.interval.end, 'MMMM dd, y hh:mm a')}`;
    }
    case DISABLE_REASON.DISABLED_AVAILABILITY: {
      return 'Disabled by Availability';
    }
  }
};

// Hook to replace selectRows
const useProductRows = (productIds: string[]) => {
  const { data: catalog } = useCatalogQuery();
  const { currentTime } = useServerTime();

  return useMemo(() => {
    if (!catalog) return [];
    return productIds.map((x) => {
      const product = catalog.products[x] as IProduct | undefined;
      if (!product)
        return {
          id: x,
          disableData: { enable: DISABLE_REASON.ENABLED } as ReturnType<typeof DisableDataCheck>,
          name: 'UNDEFINED',
        };
      const baseProductInstanceId = product.instances[0];
      const baseProductInstance = baseProductInstanceId ? catalog.productInstances[baseProductInstanceId] : null;

      const name = baseProductInstance?.displayName ?? 'UNDEFINED';
      return { id: x, disableData: DisableDataCheck(product.disabled, [], currentTime), name };
    });
  }, [catalog, currentTime, productIds]);
};

// Hook to replace selectProductModifierList
const useProductModifierList = (pid: string) => {
  const product = useProductById(pid);
  const { data: catalog } = useCatalogQuery();

  return useMemo(() => {
    if (!product || !catalog) return '';
    const mods = product.modifiers;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return mods.map((x: { mtid: string }) => catalog.modifiers[x.mtid]?.name || '').join(', ');
  }, [product, catalog]);
};

const ProductModifierList = (params: GridRenderCellParams<RowType>) => {
  const displayString = useProductModifierList(params.row.id);
  return <>{displayString}</>;
};

// Hook to replace select ProductPrinterName
const useProductPrinterName = (productId: string) => {
  const product = useProductById(productId);
  const printerGroups = usePrinterGroupsMap();

  return useMemo(() => {
    if (!product) return '';
    const pgId = product.printerGroup;
    if (!pgId) return '';

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return printerGroups[pgId]?.name ?? '';
  }, [product, printerGroups]);
};

const ProductPrinterGroupName = (params: GridRenderCellParams<RowType>) => {
  const displayString = useProductPrinterName(params.row.id);
  return <>{displayString}</>;
};

const useProductPrice = (pid: string) => {
  const product = useProductById(pid);
  return `$${(product?.price.amount ?? 0 / 100).toFixed(2)}`;
};

const ProductPrice = (params: GridRenderCellParams<RowType>) => {
  const displayString = useProductPrice(params.row.id);
  return <>{displayString}</>;
};

const ProductInstancesDetailPanel = ({ row }: { row: RowType }) => {
  const product = useProductById(row.id);
  return product && product.instances.length ? (
    <ProductInstanceTableContainer
      product_id={row.id}
      product_instance_ids={product.instances.map((x: string, idx: number) => ({
        id: x,
        base: idx === 0,
      }))}
    />
  ) : (
    <></>
  );
};

interface ProductTableContainerProps {
  product_ids: string[];
  setPanelsExpandedSize: (size: number) => void;
  disableToolbar: boolean;
  pagination?: boolean;
  title?: string;
  toolbarActions?: ToolbarAction[];
}
const ProductTableContainer = ({
  product_ids,
  // setPanelsExpandedSize,
  disableToolbar,
  pagination,
  title,
  toolbarActions,
}: ProductTableContainerProps) => {
  const { hasScopes } = useAuthContext();

  const openProductInstanceAdd = useSetAtom(openProductInstanceAddAtom);
  const openProductEdit = useSetAtom(openProductEditAtom);
  const openProductEnable = useSetAtom(openProductEnableAtom);
  const openProductDisableUntilEod = useSetAtom(openProductDisableUntilEodAtom);
  const openProductDisable = useSetAtom(openProductDisableAtom);
  const openProductCopy = useSetAtom(openProductCopyAtom);
  const openProductDelete = useSetAtom(openProductDeleteAtom);

  const productIdRows = useProductRows(product_ids);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!searchQuery) return productIdRows;
    const lowerQuery = searchQuery.toLowerCase();
    return productIdRows.filter((row) => row.name.toLowerCase().includes(lowerQuery));
  }, [productIdRows, searchQuery]);

  const [expandedRowIds, setExpandedRowIds] = useState<Set<GridRowId>>(new Set());
  const apiRef = useGridApiRef();
  const handleDetailPanelExpandedRowIdsChange = useCallback((ids: Set<GridRowId>) => {
    setExpandedRowIds(ids);
  }, []);
  const handleToggleDetailPanel = useCallback(
    (id: GridRowId) => {
      const newExpandedRowIds = new Set(expandedRowIds);
      if (newExpandedRowIds.has(id)) {
        newExpandedRowIds.delete(id);
      } else {
        newExpandedRowIds.add(id);
      }
      handleDetailPanelExpandedRowIdsChange(newExpandedRowIds);
    },
    [expandedRowIds, handleDetailPanelExpandedRowIdsChange],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, pb: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Products..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <div style={{ flexGrow: 1, overflow: 'auto' }}>
        <TableWrapperComponent
          disableToolbar={disableToolbar}
          enableSearch={false}
          apiRef={apiRef}
          initialState={
            pagination
              ? {
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }
              : undefined
          }
          columns={[
            {
              headerName: 'Actions',
              field: 'actions',
              type: 'actions',
              getActions: (params: GridRowParams<RowType>) => {
                const ADD_PRODUCT_INSTANCE = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Add Product Instance to ${params.row.name}`}>
                        <AddBox />
                      </Tooltip>
                    }
                    label={`Add Product Instance to ${params.row.name}`}
                    onClick={() => {
                      openProductInstanceAdd(params.row.id);
                    }}
                  />
                );
                const EDIT_PRODUCT = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Edit ${params.row.name}`}>
                        <Edit />
                      </Tooltip>
                    }
                    label={`Edit ${params.row.name}`}
                    onClick={() => {
                      openProductEdit(params.row.id);
                    }}
                  />
                );
                const ENABLE_PRODUCT = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Enable ${params.row.name}`}>
                        <CheckCircle />
                      </Tooltip>
                    }
                    label={`Enable ${params.row.name}`}
                    onClick={() => {
                      openProductEnable(params.row.id);
                    }}
                    showInMenu
                  />
                );
                const DISABLE_PRODUCT_UNTIL_EOD = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Disable ${params.row.name} Until End-of-Day`}>
                        <BedtimeOff />
                      </Tooltip>
                    }
                    label={`Disable ${params.row.name} Until EOD`}
                    onClick={() => {
                      openProductDisableUntilEod(params.row.id);
                    }}
                    showInMenu
                  />
                );
                const DISABLE_PRODUCT = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Disable ${params.row.name}`}>
                        <Cancel />
                      </Tooltip>
                    }
                    label={`Disable ${params.row.name}`}
                    onClick={() => {
                      openProductDisable(params.row.id);
                    }}
                    showInMenu
                  />
                );
                const COPY_PRODUCT = (
                  <GridActionsCellItem
                    icon={
                      <Tooltip title={`Copy ${params.row.name}`}>
                        <LibraryAdd />
                      </Tooltip>
                    }
                    label={`Copy ${params.row.name}`}
                    onClick={() => {
                      openProductCopy(params.row.id);
                    }}
                    showInMenu
                  />
                );
                const DELETE_PRODUCT = hasScopes('delete:catalog')
                  ? [
                      <GridActionsCellItem
                        icon={
                          <Tooltip title={`Delete ${params.row.name}`}>
                            <DeleteOutline />
                          </Tooltip>
                        }
                        label={`Delete ${params.row.name}`}
                        onClick={() => {
                          openProductDelete(params.row.id);
                        }}
                        showInMenu
                      />,
                    ]
                  : [];
                // we pass null instead of actually passing the availability because we want to make a decision based on just the .disabled value
                return params.row.disableData.enable !== DISABLE_REASON.ENABLED
                  ? [ADD_PRODUCT_INSTANCE, EDIT_PRODUCT, ENABLE_PRODUCT, COPY_PRODUCT, ...DELETE_PRODUCT]
                  : [
                      ADD_PRODUCT_INSTANCE,
                      EDIT_PRODUCT,
                      DISABLE_PRODUCT_UNTIL_EOD,
                      DISABLE_PRODUCT,
                      COPY_PRODUCT,
                      ...DELETE_PRODUCT,
                    ];
              },
            },
            { headerName: 'Name', field: 'name', flex: 6 },
            {
              headerName: 'Price',
              field: 'product.price.amount',
              renderCell: (params) => <ProductPrice {...params} />,
            },
            {
              headerName: 'Modifiers',
              field: 'product.modifiers',
              renderCell: (params) => <ProductModifierList {...params} />,
              flex: 3,
            },
            ...(hasScopes('write:order')
              ? [
                  {
                    headerName: 'Printer',
                    field: 'product.printerGroup',
                    renderCell: (params: GridRenderCellParams) => <ProductPrinterGroupName {...params} />,
                    flex: 3,
                  },
                ]
              : []),
            {
              headerName: 'Disabled',
              field: 'disableData',
              valueGetter: (v: ReturnType<typeof DisableDataCheck>) => DisableDataToString(v),
              flex: 1,
            },
          ]}
          rows={filteredRows}
          title={title}
          toolbarActions={toolbarActions}
          pagination={pagination}
          hideFooter={pagination !== true}
          getRowId={(row: RowType) => row.id}
          getDetailPanelContent={(params) => <ProductInstancesDetailPanel {...params} />}
          getDetailPanelHeight={() => 'auto'}
          onDetailPanelExpandedRowIdsChange={handleDetailPanelExpandedRowIdsChange}
          // rowThreshold={0}
          onRowClick={(params) => {
            handleToggleDetailPanel(params.id);
          }}
          detailPanelExpandedRowIds={expandedRowIds}
        />
      </div>
    </div>
  );
};

export default ProductTableContainer;
