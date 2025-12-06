import React, { useState } from 'react';

import { AddBox, DeleteOutline, Edit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import type { GridRowParams } from '@mui/x-data-grid-premium';
import { GridActionsCellItem, useGridApiRef } from '@mui/x-data-grid-premium';

import type { PrinterGroup } from '@wcp/wario-shared';
import { DialogContainer } from '@wcp/wario-ux-shared/containers';

import { usePrinterGroupsQuery } from '@/hooks/usePrinterGroupsQuery';

import { TableWrapperComponent } from '../../table_wrapper.component';

const PrinterGroupTableContainer = () => {
  const { data: printerGroups = [] } = usePrinterGroupsQuery();
  const [isPrinterGroupAddOpen, setIsPrinterGroupAddOpen] = useState(false);
  const [isPrinterGroupDeleteOpen, setIsPrinterGroupDeleteOpen] = useState(false);
  const [isPrinterGroupEditOpen, setIsPrinterGroupEditOpen] = useState(false);
  const [printerGroupIdToEdit, setPrinterGroupIdToEdit] = useState<string | null>(null);
  const apiRef = useGridApiRef();

  const editPrinterGroup = (row: PrinterGroup) => () => {
    setIsPrinterGroupEditOpen(true);
    setPrinterGroupIdToEdit(row.id);
  };

  const deletePrinterGroup = (row: PrinterGroup) => () => {
    setIsPrinterGroupDeleteOpen(true);
    setPrinterGroupIdToEdit(row.id);
  };

  return (
    <>
      <TableWrapperComponent
        sx={{ minWidth: '750px' }}
        title="Printer Group View"
        disableRowSelectionOnClick
        apiRef={apiRef}
        columns={[
          {
            headerName: 'Actions',
            field: 'actions',
            type: 'actions',
            getActions: (params: GridRowParams<PrinterGroup>) => [
              <GridActionsCellItem
                icon={
                  <Tooltip title="Edit Printer Group">
                    <Edit />
                  </Tooltip>
                }
                label="Edit Printer Group"
                onClick={editPrinterGroup(params.row)}
                key={`EDIT${params.id.toString()}`}
              />,
              <GridActionsCellItem
                icon={
                  <Tooltip title="Delete Printer Group">
                    <DeleteOutline />
                  </Tooltip>
                }
                label="Delete Printer Group"
                onClick={deletePrinterGroup(params.row)}
                key={`DELETE${params.id.toString()}`}
              />,
            ],
          },
          { headerName: 'Name', field: 'name', valueGetter: (_v, row: PrinterGroup) => row.name, flex: 4 },
          {
            headerName: 'Single Item Per Ticket',
            field: 'row.singleItemPerTicket',
            valueGetter: (_v, row: PrinterGroup) => row.singleItemPerTicket,
            flex: 3,
          },
          { headerName: 'Is Expo', field: 'row.isExpo', valueGetter: (_v, row: PrinterGroup) => row.isExpo, flex: 2 },
        ]}
        toolbarActions={[
          {
            size: 1,
            elt: (
              <Tooltip key="ADDNEW" title="Add Printer Group">
                <IconButton
                  onClick={() => {
                    setIsPrinterGroupAddOpen(true);
                  }}
                >
                  <AddBox />
                </IconButton>
              </Tooltip>
            ),
          },
        ]}
        rows={printerGroups}
        getRowId={(row: PrinterGroup) => row.id}
        disableToolbar={false}
      />
      <DialogContainer
        maxWidth="xl"
        title="Add Printer Group"
        onClose={() => {
          setIsPrinterGroupAddOpen(false);
        }}
        open={isPrinterGroupAddOpen}
        innerComponent={
          <PrinterGroupAddContainer
            onCloseCallback={() => {
              setIsPrinterGroupAddOpen(false);
            }}
          />
        }
      />
      <DialogContainer
        maxWidth="xl"
        title="Edit Printer Group"
        onClose={() => {
          setIsPrinterGroupEditOpen(false);
        }}
        open={isPrinterGroupEditOpen}
        innerComponent={
          printerGroupIdToEdit !== null && (
            <PrinterGroupEditContainer
              onCloseCallback={() => {
                setIsPrinterGroupEditOpen(false);
              }}
              printerGroupId={printerGroupIdToEdit}
            />
          )
        }
      />
      <DialogContainer
        title="Delete Printer Group"
        onClose={() => {
          setIsPrinterGroupDeleteOpen(false);
        }}
        open={isPrinterGroupDeleteOpen}
        innerComponent={
          printerGroupIdToEdit !== null && (
            <PrinterGroupDeleteContainer
              onCloseCallback={() => {
                setIsPrinterGroupDeleteOpen(false);
              }}
              printerGroupId={printerGroupIdToEdit}
            />
          )
        }
      />
    </>
  );
};

export default PrinterGroupTableContainer;

const PrinterGroupDeleteContainer = React.lazy(() => import('./PrinterGroupDeleteContainer'));
const PrinterGroupEditContainer = React.lazy(() => import('./PrinterGroupEditContainer'));
const PrinterGroupAddContainer = React.lazy(() => import('./PrinterGroupAddContainer'));
