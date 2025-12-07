import { type Dispatch, type SetStateAction, useMemo } from 'react';

import { AddBox, DeleteOutline, Edit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { GridActionsCellItem, type GridRenderCellParams, type GridRowParams } from '@mui/x-data-grid-premium';

import { type ICatalogSelectors, OrderFunctional } from '@wcp/wario-shared';
import {
  useCatalogSelectors,
  useOrderInstanceFunctionById,
  useOrderInstanceFunctionIds,
} from '@wcp/wario-ux-shared/query';

import { TableWrapperComponent } from '../table_wrapper.component';
interface OIFTableContainerProps {
  setIsOrderInstanceFunctionEditOpen: Dispatch<SetStateAction<boolean>>;
  setIsOrderInstanceFunctionDeleteOpen: Dispatch<SetStateAction<boolean>>;
  setIsOrderInstanceFunctionAddOpen: Dispatch<SetStateAction<boolean>>;
  setOrderInstanceFunctionToEdit: Dispatch<SetStateAction<string>>;
}

interface RowType {
  id: string;
}

const FunctionAsString = (params: GridRenderCellParams<RowType>) => {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const oif = useOrderInstanceFunctionById(params.row.id);
  if (!oif) {
    return <>CORRUPT DATA</>;
  }
  return <>{OrderFunctional.AbstractOrderExpressionStatementToString(oif.expression, catalogSelectors)}</>;
};

const FunctionName = (params: GridRenderCellParams<RowType>) => {
  const oif = useOrderInstanceFunctionById(params.row.id);
  return <>{oif?.name ?? ''}</>;
};

const OrderInstanceFunctionTableContainer = (props: OIFTableContainerProps) => {
  const orderInstanceFunctionsIds = useOrderInstanceFunctionIds();
  const oifRows = useMemo(() => orderInstanceFunctionsIds.map((id) => ({ id })), [orderInstanceFunctionsIds]);

  const editOrderFunction = (row: string) => () => {
    props.setIsOrderInstanceFunctionEditOpen(true);
    props.setOrderInstanceFunctionToEdit(row);
  };

  const deleteOrderFunction = (row: string) => () => {
    props.setIsOrderInstanceFunctionDeleteOpen(true);
    props.setOrderInstanceFunctionToEdit(row);
  };
  return (
    <TableWrapperComponent
      sx={{ minWidth: '750px' }}
      disableToolbar={false}
      disableRowSelectionOnClick
      title="Order Instance Functions"
      toolbarActions={[
        {
          size: 1,
          elt: (
            <Tooltip key="AddNew" title="Add Order Function">
              <IconButton
                onClick={() => {
                  props.setIsOrderInstanceFunctionAddOpen(true);
                }}
              >
                <AddBox />
              </IconButton>
            </Tooltip>
          ),
        },
      ]}
      rows={oifRows}
      getRowId={(row: RowType) => row.id}
      columns={[
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<RowType>) => [
            <GridActionsCellItem
              icon={
                <Tooltip title="Edit Order Function">
                  <Edit />
                </Tooltip>
              }
              label="Edit Order Function"
              onClick={editOrderFunction(params.row.id)}
              key="EditPF"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Delete Order Function">
                  <DeleteOutline />
                </Tooltip>
              }
              label="Delete Order Function"
              onClick={deleteOrderFunction(params.row.id)}
              key="DelPF"
            />,
          ],
        },
        { headerName: 'Name', field: 'name', flex: 1, renderCell: (params) => <FunctionName {...params} /> },
        {
          headerName: 'Function',
          field: 'expression',
          renderCell: (params) => <FunctionAsString {...params} />,
          flex: 3,
        },
      ]}
    />
  );
};

export default OrderInstanceFunctionTableContainer;
