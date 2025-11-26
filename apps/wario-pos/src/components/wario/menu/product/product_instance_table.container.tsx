import { createStructuredSelector } from "reselect";

import { DeleteOutline, Edit } from "@mui/icons-material";
import Tooltip from '@mui/material/Tooltip';
import { GridActionsCellItem, type GridRenderCellParams, type GridRowParams } from "@mui/x-data-grid-premium";

import { getProductInstanceById, weakMapCreateSelector } from "@wcp/wario-ux-shared/redux";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { openProductInstanceDelete, openProductInstanceEdit } from "@/redux/slices/CatalogSlice";
import { type RootState } from "@/redux/store";

import { TableWrapperComponent } from "../../table_wrapper.component";

// type ValueGetterRow = GridValueGetterParams<RowType>;
interface RowType { id: string; base: boolean; };

const productInstanceDisplayValueSelectors = createStructuredSelector({
  displayName: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).displayName,
  description: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).description,
  ordinal: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).ordinal,
  shortcode: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).shortcode,
  ordinalOrder: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).displayFlags.order.ordinal || 0,
  ordinalMenu: (s: RootState, piId: string) => getProductInstanceById(s.ws.productInstances, piId).displayFlags.menu.ordinal || 0,
},
  weakMapCreateSelector
)

const ProductInstanceDisplayName = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).displayName);
  return <>{displayString}</>;
}

const ProductInstanceDescription = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).description);
  return <>{displayString}</>;
}

const ProductInstanceOrdinal = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).ordinal);
  return <>{displayString}</>;
}
const ProductInstanceOrdinalMenu = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).ordinalMenu);
  return <>{displayString}</>;
}
const ProductInstanceOrdinalOrder = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).ordinalOrder);
  return <>{displayString}</>;
}

const ProductInstanceShortcode = (params: GridRenderCellParams<RowType>) => {
  const displayString = useAppSelector(s => productInstanceDisplayValueSelectors(s, params.row.id).shortcode);
  return <>{displayString}</>;
}

interface ProductInstanceTableContainerProps {
  product_instance_ids: RowType[];
}
const ProductInstanceTableContainer = ({
  product_instance_ids,
}: ProductInstanceTableContainerProps) => {
  const dispatch = useAppDispatch();
  return (
    <TableWrapperComponent
      disableToolbar
      columns={[
        {
          headerName: "Actions",
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<RowType>) => [
            <GridActionsCellItem
              key={`EDIT${params.row.id}`}
              icon={<Tooltip title="Edit Product Instance"><Edit /></Tooltip>}
              label="Edit Product Instance"
              onClick={() => dispatch(openProductInstanceEdit(params.row.id))}
            />,
            <GridActionsCellItem
              key={`DEL${params.row.id}`}
              disabled={params.row.base}
              icon={<Tooltip title="Delete Product Instance"><DeleteOutline /></Tooltip>}
              label="Delete Product Instance"
              onClick={() => dispatch(openProductInstanceDelete(params.row.id))}
            />
          ]
        },
        { headerName: "Name", field: "item.display_name", renderCell: (params) => <ProductInstanceDisplayName {...params} />, flex: 1 },
        { headerName: "Ordinal", field: "ordinal", renderCell: (params) => <ProductInstanceOrdinal {...params} /> },
        { headerName: "Menu Ordinal", field: "menuOrdinal", renderCell: (params) => <ProductInstanceOrdinalMenu {...params} /> },
        { headerName: "Order Ordinal", field: "orderOrdinal", renderCell: (params) => <ProductInstanceOrdinalOrder {...params} /> },
        { headerName: "Shortcode", field: "item.shortcode", renderCell: (params) => <ProductInstanceShortcode {...params} /> },
        { headerName: "Description", field: "item.description", renderCell: (params) => <ProductInstanceDescription {...params} /> },

      ]}
      rows={product_instance_ids}
      getRowId={(row: RowType) => row.id}
    />
  );
};

export default ProductInstanceTableContainer;
