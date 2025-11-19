import type { Props as SimplebarProps } from 'simplebar-react';

import type { SxProps, Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type ScrollbarProps = SimplebarProps &
  React.ComponentProps<'div'> & {
    sx?: SxProps<Theme>;
    fillContent?: boolean;
    slotProps?: {
      wrapperSx?: SxProps<Theme>;
      contentSx?: SxProps<Theme>;
      contentWrapperSx?: SxProps<Theme>;
    };
  };
