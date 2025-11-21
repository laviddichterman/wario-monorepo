import { useCallback } from "react";

import { AddBox, DeleteOutline, Edit, LibraryAdd } from "@mui/icons-material";
import { IconButton, Tooltip } from '@mui/material';
import type { GridRowParams } from "@mui/x-data-grid-premium";
import { GridActionsCellItem, useGridApiRef } from "@mui/x-data-grid-premium";

import type { CatalogModifierEntry } from "@wcp/wario-shared";

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { openModifierOptionAdd, openModifierTypeAdd, openModifierTypeCopy, openModifierTypeDelete, openModifierTypeEdit } from "@/redux/slices/CatalogSlice";

import { TableWrapperComponent } from "../../table_wrapper.component";
import ModifierOptionTableContainer from "../modifier_option/modifier_option_table.container";

const ModifierTypeTableContainer = () => {
  const dispatch = useAppDispatch();
  const modifiers = useAppSelector(s => s.ws.catalog?.modifiers ?? {});
  const apiRef = useGridApiRef();

  const getDetailPanelHeight = useCallback((p: GridRowParams<CatalogModifierEntry>) => p.row.options.length ? (41 + (p.row.options.length * 36)) : 0, []);

  const getDetailPanelContent = useCallback((p: GridRowParams<CatalogModifierEntry>) => p.row.options.length ? (
    <ModifierOptionTableContainer
      modifierType={p.row.modifierType}
    />
  ) : '', []);

  return (<TableWrapperComponent
    sx={{ minWidth: '750px' }}
    title="Modifier Types & Options"
    apiRef={apiRef}
    getRowId={(row: CatalogModifierEntry) => row.modifierType.id}
    columns={[
      {
        headerName: "Actions",
        field: 'actions',
        type: 'actions',
        getActions: (params: GridRowParams<CatalogModifierEntry>) => [
          <GridActionsCellItem
            icon={<Tooltip title="Edit Modifier Type"><Edit /></Tooltip>}
            label="Edit Modifier Type"
            onClick={() => dispatch(openModifierTypeEdit(params.row.modifierType.id))}
            key="EDITMT" />,
          <GridActionsCellItem
            icon={<Tooltip title="Add Modifier Option"><AddBox /></Tooltip>}
            label="Add Modifier Option"
            onClick={() => dispatch(openModifierOptionAdd(params.row.modifierType.id))}
            showInMenu
            key="ADDMO" />,
          <GridActionsCellItem
            icon={<Tooltip title="Copy Modifier Type"><LibraryAdd /></Tooltip>}
            label="Copy Modifier Type"
            onClick={() => dispatch(openModifierTypeCopy(params.row.modifierType.id))}
            showInMenu
            key="COPYMT" />,
          <GridActionsCellItem
            icon={<Tooltip title="Delete Modifier Type"><DeleteOutline /></Tooltip>}
            label="Delete Modifier Type"
            onClick={() => dispatch(openModifierTypeDelete(params.row.modifierType.id))}
            showInMenu
            key="DELMT" />
        ]
      },
      { headerName: "Name", sortable: false, field: "Modifier Name", valueGetter: (_v, row: CatalogModifierEntry) => row.modifierType.name, flex: 10 },
      { headerName: "Display Name", field: "displayName", valueGetter: (_v, row: CatalogModifierEntry) => row.modifierType.displayName, flex: 3 },
      { headerName: "Ordinal", field: "ordinal", valueGetter: (_v, row: CatalogModifierEntry) => row.modifierType.ordinal, flex: 1 },
      { headerName: "Min/Max Selected", sortable: false, hideable: false, field: "min_max", valueGetter: (_v, row: CatalogModifierEntry) => `${row.modifierType.min_selected.toString()}/${(row.modifierType.max_selected ?? "").toString()}`, flex: 2 },
    ]}
    toolbarActions={[{
      size: 1,
      elt: <Tooltip key="ADDNEW" title="Add Modifier Type"><IconButton onClick={() => dispatch(openModifierTypeAdd())}><AddBox /></IconButton></Tooltip>
    }]}
    rows={Object.values(modifiers)}
    onRowClick={(params) => { apiRef.current?.toggleDetailPanel(params.id); }}
    getDetailPanelContent={getDetailPanelContent}
    getDetailPanelHeight={getDetailPanelHeight}
    disableToolbar={false}
    disableRowSelectionOnClick
  />
  );
};

export default ModifierTypeTableContainer;
