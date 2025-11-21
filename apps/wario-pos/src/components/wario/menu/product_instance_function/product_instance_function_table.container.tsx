import React, { useState } from "react";

import { AddBox, DeleteOutline, Edit } from "@mui/icons-material";
import { IconButton, Tooltip } from '@mui/material';
import { GridActionsCellItem, type GridRowParams } from "@mui/x-data-grid-premium";

import { type IAbstractExpression, type IProductInstanceFunction, WFunctional } from "@wcp/wario-shared";
import { DialogContainer, getModifierOptionById, getModifierTypeEntryById, getProductInstanceFunctions } from "@wcp/wario-ux-shared";

import { useAppSelector } from "@/hooks/useRedux";

import { TableWrapperComponent } from "../../table_wrapper.component";

const ProductInstanceFunctionTableContainer = () => {
  const modifierTypeSelector = useAppSelector(s => (id: string) => getModifierTypeEntryById(s.ws.modifierEntries, id));
  const modifierOptionSelector = useAppSelector(s => (id: string) => getModifierOptionById(s.ws.modifierOptions, id));
  const productInstanceFunctions = useAppSelector(s => getProductInstanceFunctions(s.ws.productInstanceFunctions));
  const [isProductInstanceFunctionAddOpen, setIsProductInstanceFunctionAddOpen] = useState(false);
  const [isProductInstanceFunctionDeleteOpen, setIsProductInstanceFunctionDeleteOpen] = useState(false);
  const [isProductInstanceFunctionEditOpen, setIsProductInstanceFunctionEditOpen] = useState(false);
  const [pifIdToEdit, setPifIdToEdit] = useState<string | null>(null);

  const editProductFunction = (row: IProductInstanceFunction) => () => {
    setIsProductInstanceFunctionEditOpen(true);
    setPifIdToEdit(row.id);
  };

  const deleteProductFunction = (row: IProductInstanceFunction) => () => {
    setIsProductInstanceFunctionDeleteOpen(true);
    setPifIdToEdit(row.id);
  };
  return (
    <>
      <TableWrapperComponent
        sx={{ minWidth: "750px" }}
        disableRowSelectionOnClick
        disableToolbar={false}
        title="Product Instance Functions"
        toolbarActions={[{
          size: 1,
          elt:
            <Tooltip key="AddNew" title="Add Product Function"><IconButton onClick={() => { setIsProductInstanceFunctionAddOpen(true); }}><AddBox /></IconButton></Tooltip>
        }]}
        rows={productInstanceFunctions}
        getRowId={(row: IProductInstanceFunction) => row.id}
        columns={[
          {
            headerName: "Actions",
            field: 'actions',
            type: 'actions',
            getActions: (params: GridRowParams<IProductInstanceFunction>) => [
              <GridActionsCellItem
                icon={<Tooltip title="Edit Product Function"><Edit /></Tooltip>}
                label="Edit Product Function"
                onClick={editProductFunction(params.row)}
                key="EditPF"
              />,
              <GridActionsCellItem
                icon={<Tooltip title="Delete Product Function"><DeleteOutline /></Tooltip>}
                label="Delete Product Function"
                onClick={deleteProductFunction(params.row)}
                key="DelPF"
              />
            ]
          },
          { headerName: "Name", field: "name", flex: 1 },
          { headerName: "Function", field: "expression", valueGetter: (v: IAbstractExpression) => WFunctional.AbstractExpressionStatementToString(v, { modifierEntry: modifierTypeSelector, option: modifierOptionSelector }), flex: 3 },
        ]}
      />
      <DialogContainer
        maxWidth={"xl"}
        title={"Add Product Instance Function"}
        onClose={() => { setIsProductInstanceFunctionAddOpen(false); }}
        open={isProductInstanceFunctionAddOpen}
        innerComponent={
          <ProductInstanceFunctionAddContainer
            onCloseCallback={() => { setIsProductInstanceFunctionAddOpen(false); }}
          />
        }
      />
      <DialogContainer
        maxWidth={"xl"}
        title={"Edit Product Instance Function"}
        onClose={() => { setIsProductInstanceFunctionEditOpen(false); }}
        open={isProductInstanceFunctionEditOpen}
        innerComponent={
          pifIdToEdit !== null &&
          <ProductInstanceFunctionEditContainer
            onCloseCallback={() => { setIsProductInstanceFunctionEditOpen(false); }}
            pifId={pifIdToEdit}
          />
        }
      />
      <DialogContainer
        title={"Delete Product Instance Function"}
        onClose={() => {
          setIsProductInstanceFunctionDeleteOpen(false);
        }}
        open={isProductInstanceFunctionDeleteOpen}
        innerComponent={
          pifIdToEdit !== null &&
          <ProductInstanceFunctionDeleteContainer
            onCloseCallback={() => {
              setIsProductInstanceFunctionDeleteOpen(false);
            }}
            pifId={pifIdToEdit}
          />
        }
      />
    </>
  );
};

export default ProductInstanceFunctionTableContainer;

const ProductInstanceFunctionDeleteContainer = React.lazy(() => import("./product_instance_function.delete.container"));
const ProductInstanceFunctionEditContainer = React.lazy(() => import("./product_instance_function.edit.container"));
const ProductInstanceFunctionAddContainer = React.lazy(() => import("./product_instance_function.add.container"));

