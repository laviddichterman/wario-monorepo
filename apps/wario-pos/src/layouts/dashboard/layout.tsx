import { merge } from 'es-toolkit';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { iconButtonClasses } from '@mui/material/IconButton';
import type { Breakpoint } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

import { spreadSx } from '@wcp/wario-ux-shared/common';
import { Logo } from '@wcp/wario-ux-shared/components';

import { useAuthContext } from '@/hooks/useAuthContext';
import { useBoolean } from '@/hooks/useBoolean';

import type { NavItemProps, NavSectionProps } from '@/components/nav-section';
import { useSettingsContext } from '@/components/settings';

import { AccountDrawer } from '@/layouts/components/account-drawer';
import { LanguagePopover } from '@/layouts/components/language-popover';
import { MenuButton } from '@/layouts/components/menu-button';
import { SettingsButton } from '@/layouts/components/settings-button';
import type { HeaderSectionProps, LayoutSectionProps, MainSectionProps } from '@/layouts/core';
import { HeaderSection, layoutClasses, LayoutSection, MainSection } from '@/layouts/core';
import { DashboardFooter, type FooterProps } from '@/layouts/dashboard/footer';
import { _account } from '@/layouts/nav-config-account';
import { navData as dashboardNavData } from '@/layouts/nav-config-dashboard';
import { allLangs } from '@/locales';

import { VerticalDivider } from './content';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { NavHorizontal } from './nav-horizontal';
import { NavMobile } from './nav-mobile';
import { NavVertical } from './nav-vertical';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavSectionProps['data'];
    };
    main?: MainSectionProps;
    footer?: FooterProps;
  };
};

export function DashboardLayout({ sx, cssVars, children, slotProps, layoutQuery = 'lg' }: DashboardLayoutProps) {
  const theme = useTheme();
  const { hasScopes } = useAuthContext();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles: NavItemProps['allowedRoles']): boolean =>
    hasScopes(allowedRoles ?? [], false);

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
        sx: {
          ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
          ...(isNavHorizontal && {
            bgcolor: 'var(--layout-nav-bg)',
            height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
            [`& .${iconButtonClasses.root}`]: { color: 'var(--layout-nav-text-secondary-color)' },
          }),
        },
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      bottomArea: isNavHorizontal ? (
        <NavHorizontal
          data={navData}
          layoutQuery={layoutQuery}
          cssVars={navVars.section}
          checkPermissions={canDisplayItemByRole}
        />
      ) : null,
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile
            data={navData}
            open={open}
            onClose={onClose}
            cssVars={navVars.section}
            checkPermissions={canDisplayItemByRole}
          />

          {/** @slot Logo */}
          {isNavHorizontal && (
            <Logo
              sx={{
                display: 'none',
                [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
              }}
            />
          )}

          {/** @slot Divider */}
          {isNavHorizontal && <VerticalDivider sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }} />}
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          {/** @slot Language popover */}
          <LanguagePopover data={allLangs} />

          {/** @slot Settings button */}
          <SettingsButton />

          {/** @slot Account drawer */}
          <AccountDrawer data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={slotProps?.header?.sx}
      />
    );
  };

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      onToggleNav={() => {
        settings.setField('navLayout', settings.state.navLayout === 'vertical' ? 'mini' : 'vertical');
      }}
    />
  );

  const renderFooter = () => <DashboardFooter {...slotProps?.footer} />;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...spreadSx(sx),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
