import { Fragment } from 'react';

import Portal from '@mui/material/Portal';
import type { SxProps, Theme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

import { LoadingScreen } from '@wcp/wario-ux-shared/components';

import { type AnimateLogoProps, AnimateLogoZoom } from '@/components/animate/animate-logo';

// ----------------------------------------------------------------------

export type SplashScreenProps = React.ComponentProps<'div'> & {
  portal?: boolean;
  sx?: SxProps<Theme>;
  slots?: {
    logo?: React.ReactNode;
  };
  slotProps?: {
    wrapper?: React.ComponentProps<typeof LoadingWrapper>;
    logo?: AnimateLogoProps;
  };
};

export function SplashScreen({ portal = true, slots, slotProps, sx, ...other }: SplashScreenProps) {
  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <LoadingWrapper {...slotProps?.wrapper}>
        <LoadingContent sx={sx} {...other}>
          {slots?.logo ?? <AnimateLogoZoom {...slotProps?.logo} />}
          <LoadingScreen />
        </LoadingContent>
      </LoadingWrapper>
    </PortalWrapper>
  );
}

// ----------------------------------------------------------------------

const LoadingWrapper = styled('div')({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
});

const LoadingContent = styled('div')(({ theme }) => ({
  right: 0,
  bottom: 0,
  zIndex: 9998,
  flexGrow: 1,
  width: '100%',
  height: '100%',
  display: 'flex',
  position: 'fixed',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.vars.palette.background.default,
}));
