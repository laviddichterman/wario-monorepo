import { useSetAtom } from 'jotai';

import { DeleteOutline, Edit } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import type { GridRenderCellParams, GridRowParams } from '@mui/x-data-grid-premium';
import { GridActionsCellItem } from '@mui/x-data-grid-premium';

import { useProductInstanceById } from '@wcp/wario-ux-shared/query';

import { openProductInstanceDeleteAtom, openProductInstanceEditAtom } from '@/atoms/catalog';

import { TableWrapperComponent } from '../../table_wrapper.component';

interface RowType {
  id: string;
  base: boolean;
}

const ProductInstanceDisplayName = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.displayName ?? ''}</>;
};

const ProductInstanceDescription = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.description ?? ''}</>;
};

const ProductInstanceOrdinal = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.ordinal ?? 0}</>;
};

const ProductInstanceOrdinalMenu = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.displayFlags.menu.ordinal ?? 0}</>;
};

const ProductInstanceOrdinalOrder = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.displayFlags.order.ordinal ?? 0}</>;
};

const ProductInstanceShortcode = (params: GridRenderCellParams<RowType>) => {
  const productInstance = useProductInstanceById(params.row.id);
  return <>{productInstance?.shortcode ?? ''}</>;
};

export interface ProductInstanceTableContainerProps {
  product_instance_ids: RowType[];
}

const ProductInstanceTableContainer = ({ product_instance_ids }: ProductInstanceTableContainerProps) => {
  const openProductInstanceEdit = useSetAtom(openProductInstanceEditAtom);
  const openProductInstanceDelete = useSetAtom(openProductInstanceDeleteAtom);

  return (
    <TableWrapperComponent
      disableToolbar
      columns={[
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<RowType>) => [
            <GridActionsCellItem
              key={`EDIT${params.row.id}`}
              icon={
                <Tooltip title="Edit Product Instance">
                  <Edit />
                </Tooltip>
              }
              label="Edit Product Instance"
              onClick={() => {
                openProductInstanceEdit(params.row.id);
              }}
            />,
            <GridActionsCellItem
              key={`DEL${params.row.id}`}
              disabled={params.row.base}
              icon={
                <Tooltip title="Delete Product Instance">
                  <DeleteOutline />
                </Tooltip>
              }
              label="Delete Product Instance"
              onClick={() => {
                openProductInstanceDelete(params.row.id);
              }}
            />,
          ],
        },
        {
          headerName: 'Name',
          field: 'item.display_name',
          renderCell: (params) => <ProductInstanceDisplayName {...params} />,
          flex: 1,
        },
        { headerName: 'Ordinal', field: 'ordinal', renderCell: (params) => <ProductInstanceOrdinal {...params} /> },
        {
          headerName: 'Menu Ordinal',
          field: 'menuOrdinal',
          renderCell: (params) => <ProductInstanceOrdinalMenu {...params} />,
        },
        {
          headerName: 'Order Ordinal',
          field: 'orderOrdinal',
          renderCell: (params) => <ProductInstanceOrdinalOrder {...params} />,
        },
        {
          headerName: 'Shortcode',
          field: 'item.shortcode',
          renderCell: (params) => <ProductInstanceShortcode {...params} />,
        },
        {
          headerName: 'Description',
          field: 'item.description',
          renderCell: (params) => <ProductInstanceDescription {...params} />,
        },
      ]}
      rows={product_instance_ids}
      getRowId={(row: RowType) => row.id}
    />
  );
};

export default ProductInstanceTableContainer;
