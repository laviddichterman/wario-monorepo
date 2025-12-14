import { useSetAtom } from 'jotai';
import { useCallback } from 'react';

import { AddBox, DeleteOutline, Edit, LibraryAdd } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import type { GridRowParams } from '@mui/x-data-grid-premium';
import { GridActionsCellItem, useGridApiRef } from '@mui/x-data-grid-premium';

import type { IOptionType } from '@wcp/wario-shared/types';
import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

import {
  openModifierOptionAddAtom,
  openModifierTypeAddAtom,
  openModifierTypeCopyAtom,
  openModifierTypeDeleteAtom,
  openModifierTypeEditAtom,
} from '@/atoms/catalog';

import { TableWrapperComponent } from '../../table_wrapper.component';
import ModifierOptionTableContainer from '../modifier_option/modifier_option_table.container';

const ModifierTypeTableContainer = () => {
  const { data: catalog } = useCatalogQuery();
  const modifiers = catalog?.modifiers ?? {};

  const openModifierTypeAdd = useSetAtom(openModifierTypeAddAtom);
  const openModifierTypeEdit = useSetAtom(openModifierTypeEditAtom);
  const openModifierTypeCopy = useSetAtom(openModifierTypeCopyAtom);
  const openModifierTypeDelete = useSetAtom(openModifierTypeDeleteAtom);
  const openModifierOptionAdd = useSetAtom(openModifierOptionAddAtom);

  const apiRef = useGridApiRef();

  const getDetailPanelHeight = useCallback(
    (p: GridRowParams<IOptionType>) => (p.row.options.length ? 41 + p.row.options.length * 36 : 0),
    [],
  );

  const getDetailPanelContent = useCallback(
    (p: GridRowParams<IOptionType>) =>
      p.row.options.length ? <ModifierOptionTableContainer modifierType={p.row} /> : '',
    [],
  );

  return (
    <TableWrapperComponent
      sx={{ minWidth: '750px' }}
      title="Modifier Types & Options"
      apiRef={apiRef}
      getRowId={(row: IOptionType) => row.id}
      columns={[
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<IOptionType>) => [
            <GridActionsCellItem
              icon={
                <Tooltip title="Edit Modifier Type">
                  <Edit />
                </Tooltip>
              }
              label="Edit Modifier Type"
              onClick={() => {
                openModifierTypeEdit(params.row.id);
              }}
              key="EDITMT"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Add Modifier Option">
                  <AddBox />
                </Tooltip>
              }
              label="Add Modifier Option"
              onClick={() => {
                openModifierOptionAdd(params.row.id);
              }}
              showInMenu
              key="ADDMO"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Copy Modifier Type">
                  <LibraryAdd />
                </Tooltip>
              }
              label="Copy Modifier Type"
              onClick={() => {
                openModifierTypeCopy(params.row.id);
              }}
              showInMenu
              key="COPYMT"
            />,
            <GridActionsCellItem
              icon={
                <Tooltip title="Delete Modifier Type">
                  <DeleteOutline />
                </Tooltip>
              }
              label="Delete Modifier Type"
              onClick={() => {
                openModifierTypeDelete(params.row.id);
              }}
              showInMenu
              key="DELMT"
            />,
          ],
        },
        {
          headerName: 'Name',
          sortable: false,
          field: 'Modifier Name',
          valueGetter: (_v, row: IOptionType) => row.name,
          flex: 10,
        },
        {
          headerName: 'Display Name',
          field: 'displayName',
          valueGetter: (_v, row: IOptionType) => row.displayName,
          flex: 3,
        },
        {
          headerName: 'Ordinal',
          field: 'ordinal',
          valueGetter: (_v, row: IOptionType) => row.ordinal,
          flex: 1,
        },
        {
          headerName: 'Min/Max Selected',
          sortable: false,
          hideable: false,
          field: 'min_max',
          valueGetter: (_v, row: IOptionType) =>
            `${row.min_selected.toString()}/${(row.max_selected ?? '').toString()}`,
          flex: 2,
        },
      ]}
      toolbarActions={[
        {
          size: 1,
          elt: (
            <Tooltip key="ADDNEW" title="Add Modifier Type">
              <IconButton
                onClick={() => {
                  openModifierTypeAdd();
                }}
              >
                <AddBox />
              </IconButton>
            </Tooltip>
          ),
        },
      ]}
      rows={Object.values(modifiers)}
      onRowClick={(params) => {
        apiRef.current?.toggleDetailPanel(params.id);
      }}
      getDetailPanelContent={getDetailPanelContent}
      getDetailPanelHeight={getDetailPanelHeight}
      disableToolbar={false}
      disableRowSelectionOnClick
    />
  );
};

export default ModifierTypeTableContainer;
