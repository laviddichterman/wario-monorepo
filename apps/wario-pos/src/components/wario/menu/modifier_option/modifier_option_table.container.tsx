import { format } from 'date-fns';
import { useSetAtom } from 'jotai';

import { BedtimeOff, Cancel, CheckCircle, DeleteOutline, Edit } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import type { GridRenderCellParams, GridRowParams } from '@mui/x-data-grid-premium';
import { GridActionsCellItem } from '@mui/x-data-grid-premium';

import type { IMoney, IOption, IOptionType, IWInterval } from '@wcp/wario-shared';
import { DISABLE_REASON, DisableDataCheck } from '@wcp/wario-shared';
import { useCatalogQuery, useServerTime, useValueFromProductInstanceFunctionById } from '@wcp/wario-ux-shared/query';

import {
  openModifierOptionDeleteAtom,
  openModifierOptionDisableAtom,
  openModifierOptionDisableUntilEodAtom,
  openModifierOptionEditAtom,
  openModifierOptionEnableAtom,
} from '@/atoms/catalog';

import { TableWrapperComponent } from '../../table_wrapper.component';

export interface ModifierOptionTableContainerProps {
  modifierType: IOptionType;
}

const ProductInstanceFunctionName = (params: GridRenderCellParams<IOption>) => {
  const name = useValueFromProductInstanceFunctionById(params.row.enable ?? '', 'name');
  return <>{name ?? ''}</>;
};

const ModifierOptionTableContainer = ({ modifierType }: ModifierOptionTableContainerProps) => {
  const { data: catalog } = useCatalogQuery();
  const { currentTime } = useServerTime();

  const modifier_types_map = catalog?.modifiers ?? {};
  const modifierOptionsMap = catalog?.options ?? {};

  const openModifierOptionEdit = useSetAtom(openModifierOptionEditAtom);
  const openModifierOptionDelete = useSetAtom(openModifierOptionDeleteAtom);
  const openModifierOptionEnable = useSetAtom(openModifierOptionEnableAtom);
  const openModifierOptionDisableUntilEod = useSetAtom(openModifierOptionDisableUntilEodAtom);
  const openModifierOptionDisable = useSetAtom(openModifierOptionDisableAtom);

  return (
    <TableWrapperComponent
      disableToolbar
      disableRowSelectionOnClick
      autoHeight={false}
      columns={[
        {
          headerName: 'Actions',
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<IOption>) => {
            const title = params.row.displayName ? params.row.displayName : 'Modifier Option';
            const EDIT_MODIFIER_OPTION = (
              <GridActionsCellItem
                icon={
                  <Tooltip title={`Edit ${title}`}>
                    <Edit />
                  </Tooltip>
                }
                label={`Edit ${title}`}
                onClick={() => {
                  openModifierOptionEdit(params.row.id);
                }}
              />
            );
            const DELETE_MODIFIER_OPTION = (
              <GridActionsCellItem
                icon={
                  <Tooltip title={`Delete ${title}`}>
                    <DeleteOutline />
                  </Tooltip>
                }
                label={`Delete ${title}`}
                onClick={() => {
                  openModifierOptionDelete(params.row.id);
                }}
                showInMenu
              />
            );
            const ENABLE_MODIFIER_OPTION = (
              <GridActionsCellItem
                icon={
                  <Tooltip title={`Enable ${title}`}>
                    <CheckCircle />
                  </Tooltip>
                }
                label={`Enable ${title}`}
                onClick={() => {
                  openModifierOptionEnable(params.row.id);
                }}
                showInMenu
              />
            );
            const DISABLE_MODIFIER_OPTION_UNTIL_EOD = (
              <GridActionsCellItem
                icon={
                  <Tooltip title={`Disable ${title} Until End-of-Day`}>
                    <BedtimeOff />
                  </Tooltip>
                }
                label={`Disable ${title} Until EOD`}
                onClick={() => {
                  openModifierOptionDisableUntilEod(params.row.id);
                }}
                showInMenu
              />
            );
            const DISABLE_MODIFIER_OPTION = (
              <GridActionsCellItem
                icon={
                  <Tooltip title={`Disable ${title}`}>
                    <Cancel />
                  </Tooltip>
                }
                label={`Disable ${title}`}
                onClick={() => {
                  openModifierOptionDisable(params.row.id);
                }}
                showInMenu
              />
            );
            // we pass null instead of actually passing the availability because we want to make a decision based on just the .disabled value
            return DisableDataCheck(params.row.disabled, [], currentTime).enable !== DISABLE_REASON.ENABLED
              ? [EDIT_MODIFIER_OPTION, ENABLE_MODIFIER_OPTION, DELETE_MODIFIER_OPTION]
              : [
                  EDIT_MODIFIER_OPTION,
                  DISABLE_MODIFIER_OPTION_UNTIL_EOD,
                  DISABLE_MODIFIER_OPTION,
                  DELETE_MODIFIER_OPTION,
                ];
          },
        },
        { headerName: 'Name', field: 'displayName', flex: 1 },
        { headerName: 'Price', field: 'price', valueGetter: (v: IMoney) => `$${(v.amount / 100).toFixed(2)}` },
        { headerName: 'Shortcode', field: 'shortcode' },
        { headerName: 'Description', field: 'description' },
        { headerName: 'Ordinal', field: 'ordinal' },
        { headerName: 'FFactor', field: 'metadata.flavor_factor' },
        { headerName: 'BFactor', field: 'metadata.bake_factor' },
        { headerName: 'Can Split?', field: 'metadata.can_split' },
        {
          headerName: 'EnableFxn',
          field: 'enable',
          renderCell: (params) => <ProductInstanceFunctionName {...params} />,
        },
        // we pass null instead of actually passing the availability because we want to make a decision based on just the .disabled value
        {
          headerName: 'Disabled',
          field: 'disabled',
          valueGetter: (v: IWInterval | null) =>
            v !== null && DisableDataCheck(v, [], currentTime).enable !== DISABLE_REASON.ENABLED
              ? v.start > v.end
                ? 'True'
                : `${format(v.start, 'MMMM dd, y hh:mm a')} to ${format(v.end, 'MMMM dd, y hh:mm a')}`
              : 'False',
        },
      ]}
      getRowId={(row: IOption) => row.id}
      rows={
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        modifier_types_map[modifierType.id]?.options
          .map((x) => modifierOptionsMap[x])
          .sort((a, b) => a.ordinal - b.ordinal) ?? []
      }
    />
  );
};

export default ModifierOptionTableContainer;
