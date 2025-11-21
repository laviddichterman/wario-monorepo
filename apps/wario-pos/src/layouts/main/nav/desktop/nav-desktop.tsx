import { spreadSx } from '@wcp/wario-ux-shared';

import { Nav, NavUl } from '../components';
import type { NavMainProps } from '../types';

import { NavList } from './nav-desktop-list';

// ----------------------------------------------------------------------

export function NavDesktop({ data, sx, ...other }: NavMainProps) {
  return (
    <Nav
      sx={[
        () => ({
          /* Put styles */
        }),
        ...spreadSx(sx),
      ]}
      {...other}
    >
      <NavUl
        sx={{
          gap: 5,
          height: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {data.map((list) => (
          <NavList key={list.title} data={list} />
        ))}
      </NavUl>
    </Nav>
  );
}
