import { format } from 'date-fns';

import { BedtimeOff, Cancel, CheckCircle, DeleteOutline, Edit } from "@mui/icons-material";
import Tooltip from '@mui/material/Tooltip';
import type { GridRowParams } from "@mui/x-data-grid-premium";
import { GridActionsCellItem } from "@mui/x-data-grid-premium";

import type { IMoney, IOption, IOptionType, IWInterval } from '@wcp/wario-shared';
import { DISABLE_REASON, DisableDataCheck } from '@wcp/wario-shared';

import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

import { openModifierOptionDelete, openModifierOptionDisable, openModifierOptionDisableUntilEod, openModifierOptionEdit, openModifierOptionEnable } from "@/redux/slices/CatalogSlice";

import { TableWrapperComponent } from "../../table_wrapper.component";

export interface ModifierOptionTableContainerProps {
  modifierType: IOptionType;
};

const ModifierOptionTableContainer = ({
  modifierType
}: ModifierOptionTableContainerProps) => {
  const dispatch = useAppDispatch();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const modifier_types_map = useAppSelector(s => s.ws.catalog!.modifiers);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const modifierOptionsMap = useAppSelector(s => s.ws.catalog!.options);
  const CURRENT_TIME = useAppSelector(s => s.ws.currentTime);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const productInstanceFunctions = useAppSelector(s => s.ws.catalog!.productInstanceFunctions);

  return (
    <TableWrapperComponent
      disableToolbar
      disableRowSelectionOnClick
      autoHeight={false}
      columns={[
        {
          headerName: "Actions",
          field: 'actions',
          type: 'actions',
          getActions: (params: GridRowParams<IOption>) => {
            const title = params.row.displayName ? params.row.displayName : "Modifier Option";
            const EDIT_MODIFIER_OPTION = (<GridActionsCellItem
              icon={<Tooltip title={`Edit ${title}`}><Edit /></Tooltip>}
              label={`Edit ${title}`}
              onClick={() => dispatch(openModifierOptionEdit(params.row.id))}
            />);
            const DELETE_MODIFIER_OPTION = (<GridActionsCellItem
              icon={<Tooltip title={`Delete ${title}`}><DeleteOutline /></Tooltip>}
              label={`Delete ${title}`}
              onClick={() => dispatch(openModifierOptionDelete(params.row.id))}
              showInMenu
            />);
            const ENABLE_MODIFIER_OPTION = (<GridActionsCellItem
              icon={<Tooltip title={`Enable ${title}`}><CheckCircle /></Tooltip>}
              label={`Enable ${title}`}
              onClick={() => dispatch(openModifierOptionEnable(params.row.id))}
              showInMenu
            />);
            const DISABLE_MODIFIER_OPTION_UNTIL_EOD = (<GridActionsCellItem
              icon={<Tooltip title={`Disable ${title} Until End-of-Day`}><BedtimeOff /></Tooltip>}
              label={`Disable ${title} Until EOD`}
              onClick={() => dispatch(openModifierOptionDisableUntilEod(params.row.id))}
              showInMenu
            />)
            const DISABLE_MODIFIER_OPTION = (<GridActionsCellItem
              icon={<Tooltip title={`Disable ${title}`}><Cancel /></Tooltip>}
              label={`Disable ${title}`}
              onClick={() => dispatch(openModifierOptionDisable(params.row.id))}
              showInMenu
            />)
            // we pass null instead of actually passing the availability because we want to make a decision based on just the .disabled value
            return DisableDataCheck(params.row.disabled, [], CURRENT_TIME).enable !== DISABLE_REASON.ENABLED ? [EDIT_MODIFIER_OPTION, ENABLE_MODIFIER_OPTION, DELETE_MODIFIER_OPTION] : [EDIT_MODIFIER_OPTION, DISABLE_MODIFIER_OPTION_UNTIL_EOD, DISABLE_MODIFIER_OPTION, DELETE_MODIFIER_OPTION];
          }
        },
        { headerName: "Name", field: "displayName", flex: 1 },
        { headerName: "Price", field: "price", valueGetter: (v: IMoney) => `$${(v.amount / 100).toFixed(2)}` },
        { headerName: "Shortcode", field: "shortcode" },
        { headerName: "Description", field: "description" },
        { headerName: "Ordinal", field: "ordinal" },
        { headerName: "FFactor", field: "metadata.flavor_factor" },
        { headerName: "BFactor", field: "metadata.bake_factor" },
        { headerName: "Can Split?", field: "metadata.can_split" },
        { headerName: "EnableFxn", field: "enable", valueGetter: (v: string) => v ? productInstanceFunctions[v].name : "" },
        // we pass null instead of actually passing the availability because we want to make a decision based on just the .disabled value

        { headerName: "Disabled", field: "disabled", valueGetter: (v: IWInterval | null) => (v !== null && DisableDataCheck(v, [], CURRENT_TIME).enable !== DISABLE_REASON.ENABLED ? (v.start > v.end ? "True" : `${format(v.start, "MMMM dd, y hh:mm a")} to ${format(v.end, "MMMM dd, y hh:mm a")}`) : "False") },
      ]}
      getRowId={(row: IOption) => row.id}
      rows={modifier_types_map[modifierType.id].options.map(x => modifierOptionsMap[x]).sort((a, b) => a.ordinal - b.ordinal)}
    />
  );
};

export default ModifierOptionTableContainer;
