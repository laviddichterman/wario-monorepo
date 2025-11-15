import type { Components, Theme } from '@mui/material/styles';
import { createTheme as createMuiTheme } from '@mui/material/styles';

import type { SettingsState } from '@/components/settings';

import { components } from './core/components';
import { customShadows } from './core/custom-shadows';
import { mixins } from './core/mixins';
import { opacity } from './core/opacity';
import { palette } from './core/palette';
import { shadows } from './core/shadows';
import { typography } from './core/typography';
import { themeConfig } from './theme-config';
import type { ThemeOptions } from './types';
import { applySettingsToComponents, applySettingsToTheme } from './with-settings';

// ----------------------------------------------------------------------

export const baseTheme: ThemeOptions = {
  colorSchemes: {
    light: {
      palette: palette.light,
      shadows: shadows.light,
      customShadows: customShadows.light,
      opacity,
    },
    dark: {
      palette: palette.dark,
      shadows: shadows.dark,
      customShadows: customShadows.dark,
      opacity,
    },
  },
  mixins,
  components,
  typography,
  shape: { borderRadius: 8 },
  direction: themeConfig.direction,
  cssVariables: themeConfig.cssVariables,
};

// ----------------------------------------------------------------------

type CreateThemeProps = {
  settingsState?: SettingsState;
  themeOverrides?: ThemeOptions;
  localeComponents?: { components?: Components<Theme> };
};

export function createTheme({
  settingsState,
  themeOverrides = {},
  localeComponents = {},
}: CreateThemeProps = {}): Theme {
  // Update core theme settings (colorSchemes, typography, etc.)
  const updatedCore = settingsState ? applySettingsToTheme(baseTheme, settingsState) : baseTheme;

  // Update component settings (only components)
  const updatedComponents = settingsState ? applySettingsToComponents(settingsState) : {};

  // Create and return the final theme
  const theme = createMuiTheme(updatedCore, updatedComponents, localeComponents, themeOverrides);

  return theme;
}
