import { type Dispatch, type SetStateAction } from "react";

import { AddBox, DeleteOutline, Edit } from "@mui/icons-material";
import { IconButton, Tooltip } from '@mui/material';
import { GridActionsCellItem } from "@mui/x-data-grid-premium";

import { OrderFunctional, type OrderInstanceFunction } from "@wcp/wario-shared";
import { getModifierOptionById, getModifierTypeEntryById, getOrderInstanceFunctions } from "@wcp/wario-ux-shared/redux";

import { useAppSelector } from "../../../hooks/useRedux";
import { TableWrapperComponent } from "../table_wrapper.component";
interface OIFTableContainerProps {
  setIsOrderInstanceFunctionEditOpen: Dispatch<SetStateAction<boolean>>;
  setIsOrderInstanceFunctionDeleteOpen: Dispatch<SetStateAction<boolean>>;
  setIsOrderInstanceFunctionAddOpen: Dispatch<SetStateAction<boolean>>;
  setOrderInstanceFunctionToEdit: Dispatch<SetStateAction<OrderInstanceFunction>>;
}
const OrderInstanceFunctionTableContainer = (props: OIFTableContainerProps) => {
  const modifierTypeSelector = useAppSelector(s => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id));
  const modifierOptionSelector = useAppSelector(s => (id: string) => getModifierOptionById(s.ws.modifierOptions, id));
  const orderInstanceFunctions = useAppSelector(s => getOrderInstanceFunctions(s.ws.orderInstanceFunctions))

  const editOrderFunction = (row: OrderInstanceFunction) => () => {
    props.setIsOrderInstanceFunctionEditOpen(true);
    props.setOrderInstanceFunctionToEdit(row);
  };

  const deleteOrderFunction = (row: OrderInstanceFunction) => () => {
    props.setIsOrderInstanceFunctionDeleteOpen(true);
    props.setOrderInstanceFunctionToEdit(row);
  };
  return (
    <TableWrapperComponent
      sx={{ minWidth: "750px" }}
      disableToolbar={false}
      disableRowSelectionOnClick
      title="Order Instance Functions"
      toolbarActions={[{
        size: 1,
        elt:
          <Tooltip key="AddNew" title="Add Order Function"><IconButton onClick={() => { props.setIsOrderInstanceFunctionAddOpen(true); }}><AddBox /></IconButton></Tooltip>
      }]}
      rows={Object.values(orderInstanceFunctions)}
      getRowId={(row: OrderInstanceFunction) => row.id}
      columns={[
        {
          headerName: "Actions",
          field: 'actions',
          type: 'actions',
          getActions: (params: { row: OrderInstanceFunction }) => [
            <GridActionsCellItem
              icon={<Tooltip title="Edit Order Function"><Edit /></Tooltip>}
              label="Edit Order Function"
              onClick={editOrderFunction(params.row)}
              key="EditPF"
            />,
            <GridActionsCellItem
              icon={<Tooltip title="Delete Order Function"><DeleteOutline /></Tooltip>}
              label="Delete Order Function"
              onClick={deleteOrderFunction(params.row)}
              key="DelPF"
            />
          ]
        },
        { headerName: "Name", field: "name", valueGetter: (v: { row: OrderInstanceFunction }) => v.row.name, flex: 1 },
        { headerName: "Function", field: "expression", valueGetter: (v: { row: OrderInstanceFunction }) => OrderFunctional.AbstractOrderExpressionStatementToString(v.row.expression, { modifierEntry: modifierTypeSelector, option: modifierOptionSelector }), flex: 3 },
      ]}
    />
  );
};

export default OrderInstanceFunctionTableContainer;
