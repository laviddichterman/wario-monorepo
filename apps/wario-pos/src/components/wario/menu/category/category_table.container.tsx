import { useCallback } from "react";
import { createSelector } from "reselect";

import { DeleteOutline, Edit } from "@mui/icons-material";
import { Tooltip } from '@mui/material';
import { GRID_DETAIL_PANEL_TOGGLE_COL_DEF, GRID_TREE_DATA_GROUPING_FIELD, GridActionsCellItem, GridDetailPanelToggleCell, type GridRenderCellParams, type GridRowId, gridRowNodeSelector, type GridRowParams, useGridApiRef } from "@mui/x-data-grid-premium";

import { getCategoryEntryById, getCategoryEntryIds, weakMapCreateSelector } from "@wcp/wario-ux-shared/redux";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { openCategoryDelete, openCategoryEdit, setDetailPanelSizeForRowId } from '@/redux/slices/CatalogSlice';
import { type RootState, selectProductIdsInCategoryAfterDisableFilter } from "@/redux/store";

import { TableWrapperComponent, type ToolbarAction } from "../../table_wrapper.component";
import ProductTableContainer from "../product/product_table.container";


interface RowType { path: string[]; id: string; };

const DetailPanelContent = (params: GridRowParams<RowType>) => {
  const dispatch = useAppDispatch();
  const productsInCategory = useAppSelector(s => selectProductIdsInCategoryAfterDisableFilter(s, params.row.id));
  return productsInCategory.length > 0 && <ProductTableContainer
    disableToolbar={true}
    product_ids={productsInCategory}
    setPanelsExpandedSize={(size: number) => dispatch(setDetailPanelSizeForRowId({ id: params.row.id, size: size }))}
  />;
};

const selectCategoryCallLineName = weakMapCreateSelector(
  (s: RootState, cId: string) => getCategoryEntryById(s.ws.categories, cId),
  (category) => category.category.display_flags.call_line_name
);

const CategoryCallLineName = (params: GridRenderCellParams<RowType>) => {
  const callLineName = useAppSelector(s => selectCategoryCallLineName(s, params.row.id));
  return <>{callLineName}</>;
}

const selectCategoryOrdinal = weakMapCreateSelector(
  (s: RootState, cId: string) => getCategoryEntryById(s.ws.categories, cId),
  (category) => category.category.ordinal
);

const CategoryOrdinal = (params: GridRenderCellParams<RowType>) => {
  const ordinal = useAppSelector(s => selectCategoryOrdinal(s, params.row.id));
  return <>{ordinal}</>;
}

const selectCategoryDescription = weakMapCreateSelector(
  (s: RootState, cId: string) => getCategoryEntryById(s.ws.categories, cId),
  (category) => category.category.description
);

const CategoryDescription = (params: GridRenderCellParams<RowType>) => {
  const desc = useAppSelector(s => selectCategoryDescription(s, params.row.id));
  return <>{desc}</>;
}

const selectCategorySubheading = weakMapCreateSelector(
  (s: RootState, cId: string) => getCategoryEntryById(s.ws.categories, cId),
  (category) => category.category.subheading
);

const CategorySubheading = (params: GridRenderCellParams<RowType>) => {
  const subheading = useAppSelector(s => selectCategorySubheading(s, params.row.id));
  return <>{subheading}</>;
}

const selectCategoryFootnotes = weakMapCreateSelector(
  (s: RootState, cId: string) => getCategoryEntryById(s.ws.categories, cId),
  (category) => category.category.footnotes
);

const CategoryFootnotes = (params: GridRenderCellParams<RowType>) => {
  const footnotes = useAppSelector(s => selectCategoryFootnotes(s, params.row.id));
  return <>{footnotes}</>;
}

const CategoryGridDetailPanelToggleCell = (params: GridRenderCellParams<RowType>) => {
  const products = useAppSelector(s => selectProductIdsInCategoryAfterDisableFilter(s, params.id as string));
  return products.length > 0 ? <GridDetailPanelToggleCell {...params} /> : <></>
}

const selectCategoryIdsWithTreePath = createSelector(
  (s: RootState) => s.ws.categories,
  (categories) => {
    const pathMap: Record<string, string[]> = {};
    const ComputePath: (cId: string) => string[] = (cId) => {
      if (!Object.hasOwn(pathMap, cId)) {
        const cat = getCategoryEntryById(categories, cId);
        pathMap[cId] = cat.category.parent_id !== null ? [...ComputePath(cat.category.parent_id), cat.category.name] : [cat.category.name];
      }
      return pathMap[cId];
    };
    const category_ids = getCategoryEntryIds(categories);
    return category_ids.map(x => ({ path: ComputePath(x), id: x }));
  }
);

interface CategoryTableContainerProps {
  toolbarActions?: ToolbarAction[];
}

const CategoryTableContainer = (props: CategoryTableContainerProps) => {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategoryIdsWithTreePath);

  // const getDetailPanelHeight = useAppSelector(s => ({ row }: { row: CatalogCategoryEntry }) => selectDetailPanelSizeForRowId(s, row.category.id));
  const apiRef = useGridApiRef();
  const rowNodeSelector = useCallback((rowId: GridRowId) => gridRowNodeSelector(apiRef, rowId), [apiRef]);

  const onRowClick = useCallback((params: GridRowParams<RowType>) => {
    // if there are children categories and this row's children are not expanded, then expand the children, 
    // otherwise if there are products in this category, toggle the detail panel, else collapse the children categories
    const rowNode = rowNodeSelector(params.id);
    if (!apiRef.current) return;
    if (rowNode.type === 'group') {
      apiRef.current.setRowChildrenExpansion(params.id, !rowNode.childrenExpanded);
    } else {
      apiRef.current.toggleDetailPanel(params.id);
    }
  }, [apiRef, rowNodeSelector]);

  return <TableWrapperComponent
    sx={{ minWidth: '750px' }}
    title="Catalog Tree View"
    apiRef={apiRef}
    disableRowSelectionOnClick
    onCellClick={() => false}
    treeData
    getTreeDataPath={(row: RowType) => row.path}
    columns={[{
      ...GRID_DETAIL_PANEL_TOGGLE_COL_DEF,
      type: "string",
      renderCell: (params: GridRenderCellParams<RowType>) => <CategoryGridDetailPanelToggleCell {...params} />
    },
    {
      headerName: "Actions",
      field: 'actions',
      type: 'actions',
      getActions: (params: GridRowParams<RowType>) => [
        <GridActionsCellItem
          icon={<Tooltip title="Edit Category"><Edit /></Tooltip>}
          label="Edit Category"
          onClick={() => dispatch(openCategoryEdit(params.row.id))}
          key={`EDIT${params.id.toString()}`} />,
        <GridActionsCellItem
          icon={<Tooltip title="Delete Category"><DeleteOutline /></Tooltip>}
          label="Delete Category"
          onClick={() => dispatch(openCategoryDelete(params.row.id))}
          key={`DELETE${params.id.toString()}`} />
      ]
    },
    {
      field: GRID_TREE_DATA_GROUPING_FIELD,
      flex: 40
    },
    { headerName: "Ordinal", field: "ordinal", renderCell: (params) => <CategoryOrdinal {...params} />, flex: 3 },
    { headerName: "Call Line Name", field: "category.display_flags.call_line_name", renderCell: (params) => <CategoryCallLineName {...params} />, flex: 3 },
    { headerName: "Description", field: "category.description", renderCell: (params) => <CategoryDescription {...params} />, flex: 3 },
    { headerName: "Subheading", field: "category.subheading", renderCell: (params) => <CategorySubheading {...params} />, flex: 3 },
    { headerName: "Footnotes", field: "category.footnotes", renderCell: (params) => <CategoryFootnotes {...params} />, flex: 3 },
    ]}
    toolbarActions={props.toolbarActions}
    rows={categories}
    getRowId={(row: RowType) => row.id}
    getDetailPanelContent={(params: GridRowParams<RowType>) => <DetailPanelContent  {...params} />}
    getDetailPanelHeight={() => "auto"}
    // getDetailPanelHeight={getDetailPanelHeight}
    // rowThreshold={0}
    onRowClick={onRowClick}
    disableToolbar={false}
  />;
};

export default CategoryTableContainer;
