import React, { useMemo, useState } from 'react';

import { AddBox, DeleteOutline, Edit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { GridActionsCellItem, type GridRenderCellParams, type GridRowParams } from '@mui/x-data-grid-premium';

import { WFunctional } from '@wcp/wario-shared/logic';
import { type ICatalogSelectors } from '@wcp/wario-shared/types';
import { DialogContainer } from '@wcp/wario-ux-shared/containers';
import {
  useCatalogSelectors,
  useProductInstanceFunctionById,
  useProductInstanceFunctionIds,
  useValueFromProductInstanceFunctionById,
} from '@wcp/wario-ux-shared/query';

import { TableWrapperComponent } from '../../table_wrapper.component';

interface RowType {
  id: string;
}

const FunctionName = (params: GridRenderCellParams<RowType>) => {
  const pifName = useValueFromProductInstanceFunctionById(params.row.id, 'name');
  return <>{pifName ?? ''}</>;
};

const FunctionAsString = (params: GridRenderCellParams<RowType>) => {
  const catalogSelectors = useCatalogSelectors() as ICatalogSelectors;
  const pif = useProductInstanceFunctionById(params.row.id);
  if (!pif) {
    return <>CORRUPT DATA</>;
  }
  return <>{WFunctional.AbstractExpressionStatementToString(pif.expression, catalogSelectors)}</>;
};

const ProductInstanceFunctionTableContainer = () => {
  const productInstanceFunctions = useProductInstanceFunctionIds();
  const pifRows = useMemo(() => productInstanceFunctions.map((id) => ({ id })), [productInstanceFunctions]);
  const [isProductInstanceFunctionAddOpen, setIsProductInstanceFunctionAddOpen] = useState(false);
  const [isProductInstanceFunctionDeleteOpen, setIsProductInstanceFunctionDeleteOpen] = useState(false);
  const [isProductInstanceFunctionEditOpen, setIsProductInstanceFunctionEditOpen] = useState(false);
  const [pifIdToEdit, setPifIdToEdit] = useState<string | null>(null);

  const editProductFunction = (row: string) => () => {
    setIsProductInstanceFunctionEditOpen(true);
    setPifIdToEdit(row);
  };

  const deleteProductFunction = (row: string) => () => {
    setIsProductInstanceFunctionDeleteOpen(true);
    setPifIdToEdit(row);
  };
  return (
    <>
      <TableWrapperComponent
        sx={{ minWidth: '750px' }}
        disableRowSelectionOnClick
        disableToolbar={false}
        title="Product Instance Functions"
        toolbarActions={[
          {
            size: 1,
            elt: (
              <Tooltip key="AddNew" title="Add Product Function">
                <IconButton
                  onClick={() => {
                    setIsProductInstanceFunctionAddOpen(true);
                  }}
                >
                  <AddBox />
                </IconButton>
              </Tooltip>
            ),
          },
        ]}
        rows={pifRows}
        getRowId={(row: RowType) => row.id}
        columns={[
          {
            headerName: 'Actions',
            field: 'actions',
            type: 'actions',
            getActions: (params: GridRowParams<RowType>) => {
              return [
                <GridActionsCellItem
                  icon={
                    <Tooltip title="Edit Product Function">
                      <Edit />
                    </Tooltip>
                  }
                  label="Edit Product Function"
                  onClick={editProductFunction(params.row.id)}
                  key="EditPF"
                />,
                <GridActionsCellItem
                  icon={
                    <Tooltip title="Delete Product Function">
                      <DeleteOutline />
                    </Tooltip>
                  }
                  label="Delete Product Function"
                  onClick={deleteProductFunction(params.row.id)}
                  key="DelPF"
                />,
              ];
            },
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
      {isProductInstanceFunctionAddOpen && (
        <ProductInstanceFunctionAddContainer
          onCloseCallback={() => {
            setIsProductInstanceFunctionAddOpen(false);
          }}
        />
      )}
      {isProductInstanceFunctionEditOpen && pifIdToEdit !== null && (
        <ProductInstanceFunctionEditContainer
          onCloseCallback={() => {
            setIsProductInstanceFunctionEditOpen(false);
          }}
          pifId={pifIdToEdit}
        />
      )}
      <DialogContainer
        title={'Delete Product Instance Function'}
        onClose={() => {
          setIsProductInstanceFunctionDeleteOpen(false);
        }}
        open={isProductInstanceFunctionDeleteOpen}
        innerComponent={
          pifIdToEdit !== null && (
            <ProductInstanceFunctionDeleteContainer
              onCloseCallback={() => {
                setIsProductInstanceFunctionDeleteOpen(false);
              }}
              pifId={pifIdToEdit}
            />
          )
        }
      />
    </>
  );
};

export default ProductInstanceFunctionTableContainer;

const ProductInstanceFunctionDeleteContainer = React.lazy(() => import('./product_instance_function.delete.container'));
const ProductInstanceFunctionEditContainer = React.lazy(() => import('./product_instance_function.edit.container'));
const ProductInstanceFunctionAddContainer = React.lazy(() => import('./product_instance_function.add.container'));
