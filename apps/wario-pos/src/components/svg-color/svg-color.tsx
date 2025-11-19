import { styled } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared';

import { mergeClasses } from '@/utils';

import { svgColorClasses } from './classes';
import type { SvgColorProps } from './types';

// ----------------------------------------------------------------------

export function SvgColor({ src, className, sx, ...other }: SvgColorProps) {
  return (
    <SvgRoot
      className={mergeClasses([svgColorClasses.root, className])}
      sx={[
        {
          mask: `url(${src}) no-repeat center / contain`,
          WebkitMask: `url(${src}) no-repeat center / contain`,
        },
        ...spreadSx(sx),
      ]}
      {...other}
    />
  );
}

// ----------------------------------------------------------------------

const SvgRoot = styled('span')(() => ({
  width: 24,
  height: 24,
  flexShrink: 0,
  display: 'inline-flex',
  backgroundColor: 'currentColor',
}));
