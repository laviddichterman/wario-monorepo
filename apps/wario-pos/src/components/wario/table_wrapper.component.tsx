import React from "react";

import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  DataGridPremium, type DataGridPremiumProps,
  GridToolbarContainer,
  type GridToolbarProps,
  GridToolbarQuickFilter,
  type ToolbarPropsOverrides
} from '@mui/x-data-grid-premium';

export interface ToolbarAction {
  size: number; elt: React.ReactNode;
}
export interface CustomToolbarProps {
  title: React.ReactNode;
  actions: ToolbarAction[];
}
declare module '@mui/x-data-grid-premium' {
  interface ToolbarPropsOverrides {
    actions: ToolbarAction[];
  }
}

const CustomToolbar = ({ showQuickFilter, quickFilterProps, title, actions = [] }: GridToolbarProps & ToolbarPropsOverrides) => {
  const actionSizeSum = actions.reduce((acc, x) => acc + x.size, 0);
  return (
    <GridToolbarContainer >
      <Grid container sx={{ m: 'auto', width: '100%' }}>
        <Grid
          size={{
            xs: showQuickFilter ? 12 : 12 - actionSizeSum,
            md: showQuickFilter ? 6 : 12 - actionSizeSum
          }}>
          <Typography variant="h5">{title}</Typography>
        </Grid>
        {showQuickFilter && <Grid
          sx={{ py: 1 }}
          size={{
            xs: 12 - actionSizeSum,
            md: 6 - actionSizeSum
          }}><GridToolbarQuickFilter {...quickFilterProps} /></Grid>}
        {actions.map((action: ToolbarAction, idx: number) => (<Grid key={idx} size={action.size}>{action.elt}</Grid>))}
      </Grid>
    </GridToolbarContainer>
  );
}

interface TableWrapperComponentProps {
  disableToolbar?: boolean;
  enableSearch?: boolean;
  title?: string;
  toolbarActions?: ToolbarAction[];
}

export const TableWrapperComponent = ({
  disableToolbar = false,
  enableSearch = true,
  title,
  toolbarActions = [],
  ...forwardParams
}: TableWrapperComponentProps & DataGridPremiumProps) => (
  <DataGridPremium
    slotProps={{
      toolbar: {
        title,
        actions: toolbarActions,
        showQuickFilter: enableSearch,
        quickFilterProps: enableSearch ? { debounceMs: 500 } : undefined,
      },
    }}
    slots={disableToolbar ? {} : {
      toolbar: CustomToolbar,
    }}
    density="compact"
    hideFooter
    autoHeight
    disableColumnReorder
    {...forwardParams}
  />

);
