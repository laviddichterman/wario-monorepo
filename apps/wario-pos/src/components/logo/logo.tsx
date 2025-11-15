import type { LinkProps } from '@mui/material/Link';
import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { LogoSVG, spreadSx } from '@wcp/wario-ux-shared';

import { RouterLink } from '@/routes/components';

import { mergeClasses } from '@/utils';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

export type LogoProps = LinkProps & {
  disabled?: boolean;
};

export function Logo({
  sx,
  disabled,
  className,
  href = '/',
  ...other
}: LogoProps) {


  return (
    <LogoRoot
      component={RouterLink}
      href={href}
      aria-label="Logo"
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          width: 40,
          height: 40,
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...spreadSx(sx),
      ]}
      {...other}
    >
      <LogoSVG />
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(() => ({
  flexShrink: 0,
  color: 'transparent',
  display: 'inline-flex',
  verticalAlign: 'middle',
}));
