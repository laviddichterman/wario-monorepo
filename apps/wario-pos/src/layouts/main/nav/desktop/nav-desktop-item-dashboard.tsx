import { m } from 'motion/react';

import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { spreadSx } from '@wcp/wario-ux-shared';

import { RouterLink } from '@/routes/components';

import { varAlpha } from '@/utils/color';

import { transitionTap, varHover, varTap } from '@/components/animate';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

type NavItemDashboardProps = BoxProps & {
  path: string;
};

export function NavItemDashboard({ path, sx, ...other }: NavItemDashboardProps) {
  return (
    <Link component={RouterLink} href={path}>
      <Box
        sx={[
          (theme) => ({
            height: 360,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            color: 'text.disabled',
            justifyContent: 'center',
            bgcolor: 'background.neutral',
            px: { md: 3, lg: 10 },
            transition: theme.transitions.create('background-color', {
              duration: theme.transitions.duration.shortest,
              easing: theme.transitions.easing.sharp,
            }),
            '&:hover': {
              bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
            },
          }),
          ...spreadSx(sx),
        ]}
        {...other}
      >
        <Box
          component={m.img}
          whileTap={varTap(0.98)}
          whileHover={varHover(1.02)}
          transition={transitionTap()}
          alt="Dashboard illustration"
          src={`${CONFIG.assetsDir}/assets/illustrations/illustration-dashboard.webp`}
          sx={{ width: 640, objectFit: 'cover', aspectRatio: '4/3' }}
        />
      </Box>
    </Link>
  );
}
