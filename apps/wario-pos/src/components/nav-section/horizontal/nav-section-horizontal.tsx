import { useTheme } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared/common';

import { mergeClasses } from '@/utils/classes';

import { Scrollbar } from '../../scrollbar';
import { Nav, NavLi, NavUl } from '../components';
import { navSectionClasses, navSectionCssVars } from '../styles';
import type { NavGroupProps, NavSectionProps } from '../types';

import { NavList } from './nav-list';

// ----------------------------------------------------------------------

export function NavSectionHorizontal({
  sx,
  data,
  render,
  className,
  slotProps,
  checkPermissions,
  enabledRootRedirect,
  cssVars: overridesVars,
  ...other
}: NavSectionProps) {
  const theme = useTheme();

  const cssVars = { ...navSectionCssVars.horizontal(theme), ...overridesVars };

  return (
    <Scrollbar
      sx={{ height: 1 }}
      slotProps={{ contentSx: { height: 1, display: 'flex', alignItems: 'center' } }}
    >
      <Nav
        className={mergeClasses([navSectionClasses.horizontal, className])}
        sx={[
          () => ({
            ...cssVars,
            height: 1,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            minHeight: 'var(--nav-height)',
          }),
          ...spreadSx(sx),
        ]}
        {...other}
      >
        <NavUl sx={{ flexDirection: 'row', gap: 'var(--nav-item-gap)' }}>
          {data.map((group) => (
            <Group
              key={group.subheader ?? group.items[0].title}
              render={render}
              cssVars={cssVars}
              items={group.items}
              slotProps={slotProps}
              checkPermissions={checkPermissions}
              enabledRootRedirect={enabledRootRedirect}
            />
          ))}
        </NavUl>
      </Nav>
    </Scrollbar>
  );
}

// ----------------------------------------------------------------------

function Group({
  items,
  render,
  cssVars,
  slotProps,
  checkPermissions,
  enabledRootRedirect,
}: NavGroupProps) {
  return (
    <NavLi>
      <NavUl sx={{ flexDirection: 'row', gap: 'var(--nav-item-gap)' }}>
        {items.map((list) => (
          <NavList
            key={list.title}
            depth={1}
            data={list}
            render={render}
            cssVars={cssVars}
            slotProps={slotProps}
            checkPermissions={checkPermissions}
            enabledRootRedirect={enabledRootRedirect}
          />
        ))}
      </NavUl>
    </NavLi>
  );
}
