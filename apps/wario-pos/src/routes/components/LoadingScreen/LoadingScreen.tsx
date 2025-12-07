import { Fragment } from 'react';

import LinearProgress, { type LinearProgressProps } from '@mui/material/LinearProgress';
import Portal from '@mui/material/Portal';
import type { SxProps, Theme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared/common';

// ----------------------------------------------------------------------

export type LoadingScreenProps = React.ComponentProps<'div'> & {
  portal?: boolean;
  sx?: SxProps<Theme>;
  slots?: {
    progress?: React.ReactNode;
  };
  slotsProps?: {
    progress?: LinearProgressProps;
  };
};

export function LoadingScreen({ portal, slots, slotsProps, sx, ...other }: LoadingScreenProps) {
  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <LoadingContent sx={sx} {...other}>
        {slots?.progress ?? (
          <LinearProgress
            color="inherit"
            sx={[{ width: 1, maxWidth: 360 }, ...spreadSx(slotsProps?.progress?.sx)]}
            {...slotsProps?.progress}
          />
        )}
      </LoadingContent>
    </PortalWrapper>
  );
}

// ----------------------------------------------------------------------

const LoadingContent = styled('div')(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  display: 'flex',
  minHeight: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: theme.spacing(5),
  paddingRight: theme.spacing(5),
}));
