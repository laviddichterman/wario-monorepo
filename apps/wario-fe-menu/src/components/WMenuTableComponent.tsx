import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { getGridStringOperators, gridClasses, gridRowNodeSelector, useGridApiRef } from '@mui/x-data-grid-premium';
import type { GridEventListener, GridFilterModel, GridRowId } from '@mui/x-data-grid-premium';
import { DataGridPremium } from '@mui/x-data-grid-premium/DataGridPremium';
import { useKeepGroupedColumnsHidden } from '@mui/x-data-grid-premium/hooks';

import { type ICatalogSelectors, type IProductInstance, WCPProductGenerateMetadata, type WProduct } from '@wcp/wario-shared';
import { useCatalogSelectors, useDefaultFulfillmentId } from '@wcp/wario-ux-shared/query';
import { Separator, WarioToggleButton } from '@wcp/wario-ux-shared/styled';

import { useCurrentTimeForDefaultFulfillment, useProductInstanceIdsInCategoryForNextAvailableTime } from '@/hooks/useQuery';


export interface ToolbarAction {
  size: number; elt: React.ReactNode;
}
export interface CustomToolbarProps {
  showQuickFilter?: boolean;
  // quickFilterProps: GridToolbarQuickFilterProps;
  title: React.ReactNode;
  actions: ToolbarAction[];
}


// function CustomToolbar({ showQuickFilter, quickFilterProps, title, actions = [] }: CustomToolbarProps) {
//   const actionSizeSum = actions.reduce((acc, x) => acc + x.size, 0);
//   return (
//     <GridToolbarContainer >
//       <Grid container sx={{ m: 'auto', width: '100%' }} size={12}>
//         <Grid
//           size={{
//             xs: showQuickFilter ? 12 : 12 - actionSizeSum,
//             md: showQuickFilter ? 6 : 12 - actionSizeSum
//           }}>
//           <Typography variant="h5">{title}</Typography>
//         </Grid>
//         {showQuickFilter &&
//           <Grid
//             sx={{ py: 1 }}
//             size={{
//               xs: 12 - actionSizeSum,
//               md: 6 - actionSizeSum
//             }}>
//             <GridToolbarQuickFilter {...quickFilterProps} />
//           </Grid>
//         }
//         {actions.map((action, idx) => (<Grid sx={{ py: 1 }} key={idx} size={action.size}>{action.elt}</Grid>))}
//       </Grid>
//     </GridToolbarContainer>
//   );
// }
type RowType = {
  category: string;
  subcategory0: string;
  subcategory1: string;
  subcategory2: string;
  subcategory3: string;
  name: string;
  price: number;
  metadata: Record<string, string>;
  id: string;
}
interface WMenuDisplayProps { categoryId: string; }
// interface DGEmbeddedMetadata { size: number; ordinal: number; key: string };
// const DataGridMetadataPrefix = /DG_(S(?<size>\d)_)?(O(?<ordinal>-?\d)_)?(?<name>.*)/;

// interface HierarchicalProductStructure {
//   category: string;
//   subcategories: { [index: string]: HierarchicalProductStructure };
//   products: IProductInstance[];
// };

// function GenerateHierarchicalProductStructure(acc: HierarchicalProductStructure, curr: IProductInstance, depth: number): HierarchicalProductStructure {
//   const splitCats =  (curr.externalIDs.find(ext => ext.key === "Categories")?.value ?? "").split(',');
//   if (depth < splitCats.length) {
//     acc.subcategories[splitCats[depth]] = GenerateHierarchicalProductStructure(
//       Object.hasOwn(acc.subcategories, splitCats[depth]) ?
//         acc.subcategories[splitCats[depth]] :
//         {
//           category: splitCats[depth],
//           products: [],
//           subcategories: {}
//         }, curr, depth + 1);
//     return acc;
//   }
//   return { ...acc, products: [...acc.products, curr] } as HierarchicalProductStructure;
// }


function useProductDataForTableRows(categoryId: string): RowType[] {
  const productInstanceIds = useProductInstanceIdsInCategoryForNextAvailableTime(categoryId, 'Menu');
  const service_time = useCurrentTimeForDefaultFulfillment();
  const fulfillmentId = useDefaultFulfillmentId() as string;
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  return productInstanceIds.map(productInstanceId => {
    const productInstance = catalogSelectors.productInstance(productInstanceId) as IProductInstance;
    return { p: productInstance, m: WCPProductGenerateMetadata(productInstance.productId, productInstance.modifiers, catalogSelectors, service_time, fulfillmentId) } satisfies WProduct;
  }).map((x) => {
    return {
      id: x.p.id,
      categories: (x.p.externalIDs.find(ext => ext.key === "Categories")?.value ?? "").split(','),
      name: x.m.name,
      price: x.m.price,
      metadata: x.p.externalIDs.reduce((acc, kv) => kv.value.length ? { ...acc, [kv.key]: kv.value } : acc, {})
    }
  }).map(x => {
    return {
      id: x.id,
      category: x.categories.join(" > "),
      subcategory0: x.categories[0],
      subcategory1: x.categories.length > 1 ? x.categories[1] : "",
      subcategory2: x.categories.length > 2 ? x.categories[2] : "",
      subcategory3: x.categories.length > 3 ? x.categories[3] : "",
      name: x.name,
      price: x.price.amount,
      metadata: x.metadata
    }
  }) satisfies RowType[];
}


const BreadcrumbArrow = () =>
  <Box sx={{ alignSelf: 'center' }}>
    &rarr;
  </Box>


function MenuDataGridInner({ productRows }: { productRows: RowType[] }) {
  const apiRef = useGridApiRef();
  const [selectedFilterModel0, setSelectedFilterModel0] = useState<number>(0);
  const [selectedFilterModel1, setSelectedFilterModel1] = useState<number>(0);
  const [selectedFilterModel2, setSelectedFilterModel2] = useState<number>(0);
  const [selectedFilterModel3, setSelectedFilterModel3] = useState<number>(0);
  const rowNodeSelector = useCallback((rowId: GridRowId) => gridRowNodeSelector(apiRef, rowId), [apiRef]);


  const getFilteredRowsCount = useCallback(
    (filterModel: GridFilterModel) => {
      const { filteredRowsLookup }: { filteredRowsLookup: Record<GridRowId, boolean> } = apiRef.current?.getFilterState(filterModel) || { filteredRowsLookup: {} };
      const rowIds = apiRef.current?.getAllRowIds() || [];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
      return rowIds.filter(rowId => filteredRowsLookup[rowId] !== false).length;
    }, [apiRef]);
  // return a list of predefined filters for each subcategory0
  const predefinedFiltersForLevel0: { label: string; filterModel: GridFilterModel }[] = useMemo(
    () => {
      const uniqueStatuses = new Set(productRows.map(x => x.subcategory0));
      return [{
        label: 'All',
        filterModel: { items: [] },
      }, ...Array.from(uniqueStatuses).map((status) => ({
        label: status,
        filterModel: { items: [{ id: 0, field: 'subcategory0', operator: 'equals', value: status }] },
      }))];
    }, [productRows]);

  // return a list of predefined filters for each subcategory1
  const predefinedFiltersForLevel1: { label: string; filterModel: GridFilterModel }[] = useMemo(
    () => {
      const uniqueStatuses = new Set(productRows.map(x => x.subcategory1));
      return [{
        label: `All ${predefinedFiltersForLevel0[selectedFilterModel0].label}`,
        filterModel: { items: selectedFilterModel0 !== 0 ? predefinedFiltersForLevel0[selectedFilterModel0].filterModel.items : [] },
      }, ...Array.from(uniqueStatuses).filter(x => x !== "").map((status) => ({
        label: status,
        filterModel: { items: [...(selectedFilterModel0 !== 0 ? predefinedFiltersForLevel0[selectedFilterModel0].filterModel.items : []), { id: 1, field: 'subcategory1', operator: 'equals', value: status }] },
      }))];
    }, [productRows, predefinedFiltersForLevel0, selectedFilterModel0]);

  // return a list of predefined filters for each subcategory2
  const predefinedFiltersForLevel2: { label: string; filterModel: GridFilterModel }[] = useMemo(
    () => {
      const uniqueStatuses = new Set(productRows.map(x => x.subcategory2));
      return [{
        label: `All ${predefinedFiltersForLevel1[selectedFilterModel1].label}`,
        filterModel: { items: [...predefinedFiltersForLevel1[selectedFilterModel1].filterModel.items] },
      }, ...Array.from(uniqueStatuses).filter(x => x !== "").map((status) => ({
        label: status,
        filterModel: { items: [...predefinedFiltersForLevel1[selectedFilterModel1].filterModel.items, { id: 2, field: 'subcategory2', operator: 'equals', value: status }] },
      }))];
    }, [productRows, predefinedFiltersForLevel1, selectedFilterModel1]);

  // return a list of predefined filters for each subcategory3
  const predefinedFiltersForLevel3: { label: string; filterModel: GridFilterModel }[] = useMemo(
    () => {
      const uniqueStatuses = new Set(productRows.map(x => x.subcategory3));
      return [{
        label: `All ${predefinedFiltersForLevel2[selectedFilterModel2].label}`,
        filterModel: { items: [...predefinedFiltersForLevel2[selectedFilterModel2].filterModel.items] },
      }, ...Array.from(uniqueStatuses).filter(x => x !== "").map((status) => ({
        label: status,
        filterModel: { items: [...predefinedFiltersForLevel2[selectedFilterModel2].filterModel.items, { id: 2, field: 'subcategory3', operator: 'equals', value: status }] },
      }))];
    }, [productRows, predefinedFiltersForLevel2, selectedFilterModel2]);


  const onRowClick = React.useCallback<GridEventListener<'rowClick'>>(
    (params) => {
      if (!apiRef.current) return;
      const rowNode = rowNodeSelector(params.id);
      if (rowNode.type === 'group') {
        apiRef.current.setRowChildrenExpansion(params.id, !rowNode.childrenExpanded);
      }
    },
    [apiRef, rowNodeSelector],
  );
  const [predefinedFiltersRowCountLevel0, setPredefinedFiltersRowCountLevel0] = useState<{ index: number; count: number; }[]>([]);
  const [predefinedFiltersRowCountLevel1, setPredefinedFiltersRowCountLevel1] = useState<{ index: number; count: number; }[]>([]);
  const [predefinedFiltersRowCountLevel2, setPredefinedFiltersRowCountLevel2] = useState<{ index: number; count: number; }[]>([]);
  const [predefinedFiltersRowCountLevel3, setPredefinedFiltersRowCountLevel3] = useState<{ index: number; count: number; }[]>([]);
  const isBreadcrumb = useMemo(() => selectedFilterModel0 !== 0 && predefinedFiltersRowCountLevel1.length > 1, [selectedFilterModel0, predefinedFiltersRowCountLevel1]);

  // Calculate the row count for predefined filters level 0
  useEffect(() => {
    if (productRows.length === 0) {
      setPredefinedFiltersRowCountLevel0([]);
      return;
    }
    setPredefinedFiltersRowCountLevel0(
      predefinedFiltersForLevel0
        .map(({ filterModel }, index) => ({ index, count: getFilteredRowsCount(filterModel) }))
        .sort((a, b) => b.count - a.count)
        .filter(({ count }) => count > 0),
    );
  }, [apiRef, productRows, getFilteredRowsCount, predefinedFiltersForLevel0]);

  // Calculate the row count for predefined filters level 1
  useEffect(() => {
    if (productRows.length === 0) {
      setPredefinedFiltersRowCountLevel1([]);
      return;
    }
    setPredefinedFiltersRowCountLevel1(
      predefinedFiltersForLevel1
        .map(({ filterModel }, index) => ({ index, count: getFilteredRowsCount(filterModel) }))
        .sort((a, b) => b.count - a.count)
        .filter(({ count }) => count > 0),
    );
  }, [apiRef, productRows, predefinedFiltersForLevel1, getFilteredRowsCount]);

  // Calculate the row count for predefined filters level 2
  useEffect(() => {
    if (productRows.length === 0) {
      setPredefinedFiltersRowCountLevel2([]);
      return;
    }
    setPredefinedFiltersRowCountLevel2(
      predefinedFiltersForLevel2
        .map(({ filterModel }, index) => ({ index, count: getFilteredRowsCount(filterModel) }))
        .sort((a, b) => b.count - a.count)
        .filter(({ count }) => count > 0),
    );
  }, [apiRef, productRows, predefinedFiltersForLevel2, getFilteredRowsCount]);

  // Calculate the row count for predefined filters level 3
  useEffect(() => {
    if (productRows.length === 0) {
      setPredefinedFiltersRowCountLevel3([]);
      return;
    }
    setPredefinedFiltersRowCountLevel3(
      predefinedFiltersForLevel3
        .map(({ filterModel }, index) => ({ index, count: getFilteredRowsCount(filterModel) }))
        .sort((a, b) => b.count - a.count)
        .filter(({ count }) => count > 0),
    );
  }, [apiRef, productRows, predefinedFiltersForLevel3, getFilteredRowsCount]);

  const handleSelectFilterModelLevel0 = useCallback((index: number) => {
    // this implements a toggle behavior
    // if (index === selectedFilterModel0) {
    //   setSelectedFilterModel0(0);
    //   apiRef.current.setFilterModel({ items: [] });
    //   return;
    // }
    setSelectedFilterModel0(index);
    setSelectedFilterModel1(0);
    setSelectedFilterModel2(0);
    setSelectedFilterModel3(0);
    apiRef.current?.setFilterModel(predefinedFiltersForLevel0[index].filterModel);
  }, [apiRef, setSelectedFilterModel0, predefinedFiltersForLevel0]);

  const handleSelectFilterModelLevel1 = useCallback((index: number) => {
    setSelectedFilterModel1(index);
    setSelectedFilterModel2(0);
    setSelectedFilterModel3(0);
    apiRef.current?.setFilterModel(predefinedFiltersForLevel1[index].filterModel);
  }, [apiRef, setSelectedFilterModel1, predefinedFiltersForLevel1]);

  const handleSelectFilterModelLevel2 = useCallback((index: number) => {
    setSelectedFilterModel2(index);
    setSelectedFilterModel3(0);
    apiRef.current?.setFilterModel(predefinedFiltersForLevel2[index].filterModel);
  }, [apiRef, setSelectedFilterModel2, predefinedFiltersForLevel2]);

  const handleSelectFilterModelLevel3 = useCallback((index: number) => {
    setSelectedFilterModel3(index);
    apiRef.current?.setFilterModel(predefinedFiltersForLevel3[index].filterModel);
  }, [apiRef, setSelectedFilterModel3, predefinedFiltersForLevel3]);

  const level0Buttons = useMemo(() => predefinedFiltersRowCountLevel0.length > 2 ?
    // level 0 is special cased to always show "All" and the selected filter
    predefinedFiltersRowCountLevel0.filter(({ index }) => (index === 0 || index === selectedFilterModel0 || selectedFilterModel0 === 0)) : [],
    [predefinedFiltersRowCountLevel0, selectedFilterModel0]);
  const level1Buttons = useMemo(() => predefinedFiltersRowCountLevel1.length > 1 && selectedFilterModel0 !== 0 ?
    predefinedFiltersRowCountLevel1.filter(({ index }) => (predefinedFiltersRowCountLevel2.length < 2 || selectedFilterModel1 === 0 || index === selectedFilterModel1)) : [],
    [predefinedFiltersRowCountLevel1, selectedFilterModel0, predefinedFiltersRowCountLevel2.length, selectedFilterModel1]);
  const level2Buttons = useMemo(() => predefinedFiltersRowCountLevel2.length > 1 && selectedFilterModel1 !== 0 ?
    predefinedFiltersRowCountLevel2.filter(({ index }) => (predefinedFiltersRowCountLevel3.length < 2 || selectedFilterModel2 === 0 || index === selectedFilterModel2)) : [],
    [predefinedFiltersRowCountLevel2, selectedFilterModel1, predefinedFiltersRowCountLevel3.length, selectedFilterModel2]);
  const level3Buttons = useMemo(() => predefinedFiltersRowCountLevel3.length > 1 && selectedFilterModel2 !== 0 ?
    predefinedFiltersRowCountLevel3 : [],
    [selectedFilterModel2, predefinedFiltersRowCountLevel3]);
  const initialState = useKeepGroupedColumnsHidden({
    apiRef,
    initialState: {
      sorting: {
        sortModel: [{ field: 'category', sort: 'asc' }],
      },
      columns: {
        columnVisibilityModel: {
          subcategory0: false,
          subcategory1: false,
          subcategory2: false,
          subcategory3: false,
        }
      }
    },
  });
  return (
    <div style={{ overflow: 'hidden' }}>
      {
        <Stack direction="row" gap={1} m={1} flexWrap="wrap">
          {level0Buttons.map(({ count, index }) => {
            return (
              <>
                <WarioToggleButton
                  sx={{ px: "9px", }}
                  key={predefinedFiltersForLevel0[index].label}
                  onClick={() => { handleSelectFilterModelLevel0(index); }}
                  // selectedFilterModel1 === 0 check means no level 1 filter is selected, so we should still highlight this in the breadcrumb case
                  selected={selectedFilterModel0 === index && selectedFilterModel1 === 0}
                  value={index} >
                  {`${predefinedFiltersForLevel0[index].label} (${count.toString()})`}
                </WarioToggleButton>
                {isBreadcrumb && index === 0 && <BreadcrumbArrow />}
              </>
            );
          })
          }
          {isBreadcrumb && selectedFilterModel0 !== 0 && predefinedFiltersRowCountLevel1.length > 1 &&
            <>
              {selectedFilterModel1 !== 0 && level1Buttons.length === 1 &&
                <>
                  <BreadcrumbArrow />
                  <WarioToggleButton
                    sx={{ px: "9px", }}
                    key={predefinedFiltersForLevel1[selectedFilterModel1].label}
                    onClick={() => { handleSelectFilterModelLevel1(selectedFilterModel1); }}
                    selected={selectedFilterModel2 === 0}
                    value={selectedFilterModel1} >
                    {`${predefinedFiltersForLevel1[selectedFilterModel1].label} (${level1Buttons[0].count.toString()})`}
                  </WarioToggleButton>
                  {selectedFilterModel2 !== 0 && level2Buttons.length === 1 &&
                    <>
                      <BreadcrumbArrow />
                      <WarioToggleButton
                        sx={{ px: "9px", }}
                        key={predefinedFiltersForLevel2[selectedFilterModel2].label}
                        onClick={() => { handleSelectFilterModelLevel2(selectedFilterModel2); }}
                        selected={selectedFilterModel3 === 0}
                        value={selectedFilterModel2} >
                        {`${predefinedFiltersForLevel2[selectedFilterModel2].label} (${level2Buttons[0].count.toString()})`}
                      </WarioToggleButton>
                      {selectedFilterModel3 !== 0 && level3Buttons.length === 1 &&
                        <>
                          <BreadcrumbArrow />
                          <WarioToggleButton
                            sx={{ px: "9px", }}
                            key={predefinedFiltersForLevel3[selectedFilterModel3].label}
                            onClick={() => { handleSelectFilterModelLevel3(selectedFilterModel3); }}
                            selected={true}
                            value={selectedFilterModel3} >
                            {`${predefinedFiltersForLevel3[selectedFilterModel3].label} (${level3Buttons[0].count.toString()})`}
                          </WarioToggleButton>
                        </>
                      }
                    </>
                  }
                </>
              }
            </>
          }

        </Stack>
      }
      {selectedFilterModel0 !== 0 && level1Buttons.length > 1 &&
        <>
          <Separator />
          <Stack direction="row" gap={1} m={1} flexWrap="wrap">
            {level1Buttons.map(({ count, index }) => {
              return (
                <WarioToggleButton
                  sx={{ px: "9px", }}
                  key={predefinedFiltersForLevel1[index].label}
                  onClick={() => { handleSelectFilterModelLevel1(index); }}
                  selected={selectedFilterModel1 === index}
                  value={index} >
                  {`${predefinedFiltersForLevel1[index].label} (${count.toString()})`}
                </WarioToggleButton>
              );
            })}</Stack>
        </>
      }

      {selectedFilterModel1 !== 0 && level2Buttons.length > 1 &&
        <>
          <Separator />
          <Stack direction="row" gap={1} m={1} flexWrap="wrap">
            {level2Buttons.map(({ count, index }) => {
              return (
                <WarioToggleButton
                  sx={{ px: "9px", }}
                  key={predefinedFiltersForLevel2[index].label}
                  onClick={() => { handleSelectFilterModelLevel2(index); }}
                  selected={selectedFilterModel2 === index}
                  value={index} >
                  {`${predefinedFiltersForLevel2[index].label} (${count.toString()})`}
                </WarioToggleButton>
              );
            })}</Stack>
        </>
      }
      {selectedFilterModel2 !== 0 && level3Buttons.length > 1 &&
        <>
          <Separator />
          <Stack direction="row" gap={1} m={1} flexWrap="wrap">
            {level3Buttons.map(({ count, index }) => {
              return (
                <WarioToggleButton
                  sx={{ px: "9px", }}
                  key={predefinedFiltersForLevel3[index].label}
                  onClick={() => { handleSelectFilterModelLevel3(index); }}
                  selected={selectedFilterModel3 === index}
                  value={index} >
                  {`${predefinedFiltersForLevel3[index].label} (${count.toString()})`}
                </WarioToggleButton>
              );
            })}</Stack>
        </>
      }
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGridPremium
          slotProps={{
            toolbar: {
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true },
              excelOptions: { disableToolbarButton: true }
            },
          }}
          sx={{
            [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
              outline: 'none',
            },
            [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]:
            {
              outline: 'none',
            },
          }}
          apiRef={apiRef}
          getRowHeight={() => 'auto'}
          onRowClick={onRowClick}
          initialState={initialState}
          density="compact"
          disableColumnMenu={true}
          disableClipboardPaste={true}
          disableEval={true}
          disableColumnSorting={true}
          // autoHeight
          columns={[
            { headerName: "Category", field: "category", flex: 4 },
            { headerName: "subcategory0", field: "subcategory0", filterOperators: getGridStringOperators() },
            { headerName: "subcategory1", field: "subcategory1", filterOperators: getGridStringOperators() },
            { headerName: "subcategory2", field: "subcategory2", filterOperators: getGridStringOperators() },
            { headerName: "subcategory3", field: "subcategory3", filterOperators: getGridStringOperators() },
            { headerName: "Name", field: "name", flex: 10, aggregable: false },
            //...dynamicColumns,
            { headerName: "Price", field: "price", flex: 2, type: 'number', valueFormatter: (value, _row) => value / 100 },
          ]}

          rows={productRows}
        />
      </Box>
    </div>
  );
}

export function WMenuDataGrid({ categoryId }: WMenuDisplayProps) {
  const memoizedComputedRows = useProductDataForTableRows(categoryId);

  // const dynamicColumns: GridColDef<{ id: string; }>[] = useMemo(() => {
  //   const acc: Record<string, DGEmbeddedMetadata> = {};
  //   productRows.forEach((piid) => {
  //     const pi = productInstanceSelector(piid)
  //     return pi.externalIDs.forEach(md => {
  //     if (md.value.length > 0) {
  //       const keyMatch = md.key.match(DataGridMetadataPrefix);
  //       if (keyMatch?.groups) {
  //         acc[keyMatch.groups.name] = { ordinal: Number.parseInt(keyMatch.groups.ordinal ?? "1"), size: Number.parseInt(keyMatch.groups.ordinal ?? "3"), key: md.key };
  //       }
  //     }
  //   })}
  // );
  // { headerName: "Ordinal", field: "ordinal", valueGetter: (v: ValueGetterRow) => v.row.category.ordinal, flex: 3 },
  return <MenuDataGridInner productRows={memoizedComputedRows} />;
}

export default WMenuDataGrid;