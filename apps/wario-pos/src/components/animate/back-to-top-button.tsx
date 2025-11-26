import { cloneElement } from 'react';

import type { FabProps } from '@mui/material/Fab';
import Fab from '@mui/material/Fab';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { useBackToTop } from '@/hooks/useBackToTop';

import { Iconify } from '../iconify';

// ----------------------------------------------------------------------

type BackToTopProps = FabProps & {
  isDebounce?: boolean;
  scrollThreshold?: string | number;
  renderButton?: (isVisible?: boolean) => React.ReactElement;
};

export function BackToTopButton({
  sx,
  isDebounce,
  renderButton,
  scrollThreshold = '90%',
  ...other
}: BackToTopProps) {
  const { onBackToTop, isVisible } = useBackToTop(scrollThreshold, isDebounce);

  if (renderButton) {
    return cloneElement(renderButton(isVisible) as React.ReactElement<{ onClick?: () => void }>, {
      onClick: onBackToTop,
    });
  }

  return (
    <Fab
      aria-label="Back to top"
      onClick={onBackToTop}
      sx={[
        (theme) => ({
          width: 48,
          height: 48,
          position: 'fixed',
          transform: 'scale(0)',
          right: { xs: 24, md: 32 },
          bottom: { xs: 24, md: 32 },
          zIndex: theme.zIndex.speedDial,
          transition: theme.transitions.create(['transform']),
          ...(isVisible && { transform: 'scale(1)' }),
        }),
        ...spreadSx(sx),
      ]}
      {...other}
    >
      <Iconify width={24} icon="solar:double-alt-arrow-up-bold-duotone" />
    </Fab>
  );
}
