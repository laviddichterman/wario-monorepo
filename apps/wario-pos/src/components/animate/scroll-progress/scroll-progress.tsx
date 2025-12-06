import type { MotionProps, MotionValue } from 'motion/react';
import { m, useSpring, useTransform } from 'motion/react';
import { Fragment } from 'react';

import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import type { SxProps, Theme } from '@mui/material/styles';
import { styled, useTheme } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { mergeClasses } from '@/utils/classes';

import { scrollProgressClasses } from '@/components/animate/scroll-progress/use-scroll-progress';

// ----------------------------------------------------------------------



type BaseProps = MotionProps & React.ComponentProps<'svg'> & React.ComponentProps<'div'>;

export interface ScrollProgressProps extends BaseProps {
  size?: number;
  portal?: boolean;
  thickness?: number;
  sx?: SxProps<Theme>;
  whenScroll?: 'x' | 'y';
  progress: MotionValue<number>;
  variant: 'linear' | 'circular';
  color?: 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  slotProps?: {
    wrapper?: BoxProps;
  };
}

export function ScrollProgress({
  sx,
  size,
  portal,
  variant,
  slotProps,
  className,
  thickness = 3.6,
  whenScroll = 'y',
  color = 'primary',
  progress: progressProps,
  ...other
}: ScrollProgressProps) {
  const theme = useTheme();

  const isRtl = theme.direction === 'rtl';

  const transformProgress = useTransform(progressProps, [0, -1], [0, 1]);

  const progress = isRtl && whenScroll === 'x' ? transformProgress : progressProps;

  const scaleX = useSpring(progress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const progressSize = variant === 'circular' ? (size ?? 64) : (size ?? 3);

  const renderCircular = () => (
    <CircularRoot
      viewBox={`0 0 ${progressSize.toString()} ${progressSize.toString()}`}
      xmlns="http://www.w3.org/2000/svg"
      className={mergeClasses([scrollProgressClasses.circular, className])}
      sx={[
        {
          width: progressSize,
          height: progressSize,
          ...(color !== 'inherit' && { color: theme.vars.palette[color].main }),
        },
        ...spreadSx(sx),
      ]}
      {...other}
    >
      <circle
        cx={progressSize / 2}
        cy={progressSize / 2}
        r={progressSize / 2 - thickness - 4}
        strokeWidth={thickness}
        strokeOpacity={0.2}
      />

      <m.circle
        cx={progressSize / 2}
        cy={progressSize / 2}
        r={progressSize / 2 - thickness - 4}
        strokeWidth={thickness}
        style={{ pathLength: progress }}
      />
    </CircularRoot>
  );

  const renderLinear = () => (
    <LinearRoot
      className={mergeClasses([scrollProgressClasses.linear, className])}
      sx={[
        {
          height: progressSize,
          ...(color !== 'inherit' && {
            background: `linear-gradient(135deg, ${theme.vars.palette[color].light}, ${theme.vars.palette[color].main})`,
          }),
        },
        ...spreadSx(sx),
      ]}
      style={{ scaleX }}
      {...other}
    />
  );

  const PortalWrapper = portal ? Portal : Fragment;

  return (
    <PortalWrapper>
      <Box {...slotProps?.wrapper}>
        {variant === 'circular' ? renderCircular() : renderLinear()}
      </Box>
    </PortalWrapper>
  );
}

// ----------------------------------------------------------------------

const CircularRoot = styled(m.svg)(({ theme }) => ({
  transform: 'rotate(-90deg)',
  color: theme.vars.palette.text.primary,
  circle: { fill: 'none', strokeDashoffset: 0, stroke: 'currentColor' },
}));

const LinearRoot = styled(m.div)(({ theme }) => ({
  top: 0,
  left: 0,
  right: 0,
  transformOrigin: '0%',
  backgroundColor: theme.vars.palette.text.primary,
}));
