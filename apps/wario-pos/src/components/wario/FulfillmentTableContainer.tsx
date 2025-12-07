// import { GridActionsCellItem } from "@mui/x-data-grid";
import { AddBox, DeleteOutline, Edit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { GridActionsCellItem, type GridRowParams, useGridApiRef } from '@mui/x-data-grid-premium';

import { type FulfillmentConfig } from '@wcp/wario-shared';
import { useFulfillments } from '@wcp/wario-ux-shared/query';

import { TableWrapperComponent } from './table_wrapper.component';

export interface FulfillmentTableContainerProps {
  setIsFulfillmentEditOpen: (v: boolean) => void;
  setIsFulfillmentDeleteOpen: (v: boolean) => void;
  setIsFulfillmentAddOpen: (v: boolean) => void;
  setFulfillmentToEdit: (v: FulfillmentConfig) => void;
}
const FulfillmentTableContainer = ({
  setIsFulfillmentEditOpen,
  setIsFulfillmentDeleteOpen,
  setIsFulfillmentAddOpen,
  setFulfillmentToEdit,
}: FulfillmentTableContainerProps) => {
  const fulfillments = useFulfillments();
  const apiRef = useGridApiRef();

  const editFulfillment = (fulfillment: FulfillmentConfig) => () => {
    setIsFulfillmentEditOpen(true);
    setFulfillmentToEdit(fulfillment);
  };

  const deleteFulfillment = (fulfillment: FulfillmentConfig) => () => {
    setIsFulfillmentDeleteOpen(true);
    setFulfillmentToEdit(fulfillment);
  };

  return (
    <TableWrapperComponent
      title="Fulfillment Config"
      apiRef={apiRef}
      enableSearch={false}
      columns={[
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<FulfillmentConfig>) => [
            <GridActionsCellItem
              icon={
                <Tooltip title="Edit Fulfillment">
                  <Edit />
                </Tooltip>
              }
              label="Edit Fulfillment"
              onClick={editFulfillment(params.row)}
              key={`EDIT${params.row.id}`}
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Delete Fulfillment">
                  <DeleteOutline />
                </Tooltip>
              }
              label="Delete Fulfillment"
              onClick={deleteFulfillment(params.row)}
              key={`DELETE${params.row.id}`}
            />,
          ],
        },
        { headerName: 'Display Name', field: 'displayName', flex: 4 },
        { headerName: 'Ordinal', field: 'ordinal', flex: 1 },
        { headerName: 'FulfillmentType', field: 'service', flex: 2 },
      ]}
      toolbarActions={[
        {
          size: 1,
          elt: (
            <Tooltip key="ADDNEW" title="Add Fulfillment">
              <IconButton
                onClick={() => {
                  setIsFulfillmentAddOpen(true);
                }}
              >
                <AddBox />
              </IconButton>
            </Tooltip>
          ),
        },
      ]}
      rows={fulfillments}
      disableRowSelectionOnClick
    />
  );
};

export default FulfillmentTableContainer;
