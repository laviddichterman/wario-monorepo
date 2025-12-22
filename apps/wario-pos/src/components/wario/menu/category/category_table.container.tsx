import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

import { DeleteOutline, Edit } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import {
  GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
  GRID_TREE_DATA_GROUPING_FIELD,
  GridActionsCellItem,
  GridDetailPanelToggleCell,
  type GridRenderCellParams,
  type GridRowId,
  gridRowNodeSelector,
  type GridRowParams,
  useGridApiRef,
} from '@mui/x-data-grid-premium';

import type { ICategory } from '@wcp/wario-shared/types';
import { useCatalogQuery, useCategoryIds, useValueFromCategoryById } from '@wcp/wario-ux-shared/query';

import {
  hideDisabledProductsAtom,
  openCategoryDeleteAtom,
  openCategoryEditAtom,
  setDetailPanelSizeForRowIdAtom,
} from '@/atoms/catalog';

import { TableWrapperComponent, type ToolbarAction } from '../../table_wrapper.component';
import ProductTableContainer from '../product/product_table.container';

interface RowType {
  path: string[];
  id: string;
}

// Hook to replace selectProductIdsInCategoryAfterDisableFilter
const useProductIdsInCategoryAfterDisableFilter = (categoryId: string) => {
  const hideDisabledProducts = useAtomValue(hideDisabledProductsAtom);
  const { data: catalog } = useCatalogQuery();

  return useMemo(() => {
    if (!catalog) return [];
    const products = Object.values(catalog.products);
    const filteredProducts = !hideDisabledProducts
      ? products
      : products.filter((x) => !x.disabled || x.disabled.start <= x.disabled.end);

    // Find products that are in this category by checking the category's products array
    const category = catalog.categories[categoryId];
    const categoryProductIds = category.products;
    return filteredProducts.filter((x) => categoryProductIds.includes(x.id)).map((x) => x.id);
  }, [catalog, hideDisabledProducts, categoryId]);
};

const DetailPanelContent = (params: GridRowParams<RowType>) => {
  const setDetailPanelSizeForRowId = useSetAtom(setDetailPanelSizeForRowIdAtom);
  const productsInCategory = useProductIdsInCategoryAfterDisableFilter(params.row.id);
  return (
    productsInCategory.length > 0 && (
      <ProductTableContainer
        disableToolbar={true}
        product_ids={productsInCategory}
        setPanelsExpandedSize={(size: number) => {
          setDetailPanelSizeForRowId({ id: params.row.id, size: size });
        }}
      />
    )
  );
};

const CategoryCallLineName = (params: GridRenderCellParams<RowType>) => {
  const callLineName = useValueFromCategoryById(params.row.id, 'display_flags')?.call_line_name;
  return <>{callLineName}</>;
};

const CategoryDescription = (params: GridRenderCellParams<RowType>) => {
  const desc = useValueFromCategoryById(params.row.id, 'description');
  return <>{desc}</>;
};

const CategorySubheading = (params: GridRenderCellParams<RowType>) => {
  const subheading = useValueFromCategoryById(params.row.id, 'subheading');
  return <>{subheading}</>;
};

const CategoryFootnotes = (params: GridRenderCellParams<RowType>) => {
  const footnotes = useValueFromCategoryById(params.row.id, 'footnotes');
  return <>{footnotes}</>;
};

const CategoryGridDetailPanelToggleCell = (params: GridRenderCellParams<RowType>) => {
  const products = useProductIdsInCategoryAfterDisableFilter(params.id as string);
  return products.length > 0 ? <GridDetailPanelToggleCell {...params} /> : <></>;
};

// Hook to replace selectCategoryIdsWithTreePath
const useCategoryIdsWithTreePath = () => {
  const { data: catalog } = useCatalogQuery();
  const categoryIds = useCategoryIds();

  return useMemo(() => {
    if (!catalog) return [];

    const pathMap: Record<string, string[]> = {};

    // Build parent lookup: childId -> parentId
    const parentLookup: Record<string, string | null> = {};
    Object.entries(catalog.categories).forEach(([catId, cat]) => {
      // Each category's children array tells us the parent->child relationship
      cat.children.forEach((childId: string) => {
        parentLookup[childId] = catId;
      });
      // Initialize root categories (those not in any children array)
      if (!Object.hasOwn(parentLookup, catId)) {
        parentLookup[catId] = null;
      }
    });

    const ComputePath: (cId: string) => string[] = (cId) => {
      if (!Object.hasOwn(pathMap, cId)) {
        const cat = catalog.categories[cId] as ICategory | undefined;
        if (!cat) return []; // Should not happen if data is consistent
        const parentId = parentLookup[cId];
        pathMap[cId] = parentId !== null ? [...ComputePath(parentId), cat.name] : [cat.name];
      }
      return pathMap[cId];
    };

    return categoryIds.map((x) => ({ path: ComputePath(x), id: x }));
  }, [catalog, categoryIds]);
};

interface CategoryTableContainerProps {
  toolbarActions?: ToolbarAction[];
}

const CategoryTableContainer = (props: CategoryTableContainerProps) => {
  const openCategoryEdit = useSetAtom(openCategoryEditAtom);
  const openCategoryDelete = useSetAtom(openCategoryDeleteAtom);
  const categories = useCategoryIdsWithTreePath();

  const apiRef = useGridApiRef();
  const rowNodeSelector = useCallback((rowId: GridRowId) => gridRowNodeSelector(apiRef, rowId), [apiRef]);

  const onRowClick = useCallback(
    (params: GridRowParams<RowType>) => {
      // if there are children categories and this row's children are not expanded, then expand the children,
      // otherwise if there are products in this category, toggle the detail panel, else collapse the children categories
      const rowNode = rowNodeSelector(params.id);
      if (!apiRef.current) return;
      if (rowNode.type === 'group') {
        apiRef.current.setRowChildrenExpansion(params.id, !rowNode.childrenExpanded);
      } else {
        apiRef.current.toggleDetailPanel(params.id);
      }
    },
    [apiRef, rowNodeSelector],
  );

  return (
    <TableWrapperComponent
      sx={{ minWidth: '750px' }}
      title="Catalog Tree View"
      apiRef={apiRef}
      disableRowSelectionOnClick
      onCellClick={() => false}
      treeData
      getTreeDataPath={(row: RowType) => row.path}
      columns={[
        {
          ...GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
          type: 'string',
          renderCell: (params: GridRenderCellParams<RowType>) => <CategoryGridDetailPanelToggleCell {...params} />,
        },
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<RowType>) => [
            <GridActionsCellItem
              icon={
                <Tooltip title="Edit Category">
                  <Edit />
                </Tooltip>
              }
              label="Edit Category"
              onClick={() => {
                openCategoryEdit(params.row.id);
              }}
              key={`EDIT${params.id.toString()}`}
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Delete Category">
                  <DeleteOutline />
                </Tooltip>
              }
              label="Delete Category"
              onClick={() => {
                openCategoryDelete(params.row.id);
              }}
              key={`DELETE${params.id.toString()}`}
            />,
          ],
        },
        {
          field: GRID_TREE_DATA_GROUPING_FIELD,
          flex: 40,
        },
        {
          headerName: 'Call Line Name',
          field: 'category.display_flags.call_line_name',
          renderCell: (params) => <CategoryCallLineName {...params} />,
          flex: 3,
        },
        {
          headerName: 'Description',
          field: 'category.description',
          renderCell: (params) => <CategoryDescription {...params} />,
          flex: 3,
        },
        {
          headerName: 'Subheading',
          field: 'category.subheading',
          renderCell: (params) => <CategorySubheading {...params} />,
          flex: 3,
        },
        {
          headerName: 'Footnotes',
          field: 'category.footnotes',
          renderCell: (params) => <CategoryFootnotes {...params} />,
          flex: 3,
        },
      ]}
      toolbarActions={props.toolbarActions}
      rows={categories}
      getRowId={(row: RowType) => row.id}
      getDetailPanelContent={(params: GridRowParams<RowType>) => <DetailPanelContent {...params} />}
      getDetailPanelHeight={() => 'auto'}
      // getDetailPanelHeight={getDetailPanelHeight}
      // rowThreshold={0}
      onRowClick={onRowClick}
      disableToolbar={false}
    />
  );
};

export default CategoryTableContainer;
