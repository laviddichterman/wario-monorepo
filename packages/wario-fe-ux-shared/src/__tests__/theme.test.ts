/**
 * Theme Configuration Tests
 *
 * Tests to validate the theme configuration object structure.
 */
import { describe, expect, it } from 'vitest';

import { themeOptions } from '../theme';

describe('themeOptions', () => {
  it('exports a valid theme options object', () => {
    expect(themeOptions).toBeDefined();
    expect(typeof themeOptions).toBe('object');
  });

  it('defines custom breakpoints', () => {
    expect(themeOptions.breakpoints).toBeDefined();
    expect(themeOptions.breakpoints?.values).toEqual({
      xs: 0,
      sm: 500,
      md: 750,
      lg: 935,
      xl: 1250,
    });
  });

  it('configures snackbar zIndex', () => {
    expect(themeOptions.zIndex?.snackbar).toBe(2500);
  });

  it('sets Cabin as the primary font family', () => {
    expect(themeOptions.typography).toBeDefined();

    // Check allVariants has Cabin font
    const typography = themeOptions.typography as Record<string, unknown>;
    const allVariants = typography.allVariants as Record<string, string>;
    expect(allVariants.fontFamily).toBe('Cabin');

    // Check fontFamily includes Cabin
    expect(typography.fontFamily).toContain('Cabin');
  });

  it('configures heading typography with Source Sans Pro', () => {
    const typography = themeOptions.typography as Record<string, unknown>;

    const headings = ['h1', 'h2', 'h3', 'h4', 'h5'];
    for (const heading of headings) {
      const headingConfig = typography[heading] as Record<string, string>;
      expect(headingConfig.fontFamily).toBe('Source Sans Pro');
      expect(headingConfig.textTransform).toBe('uppercase');
    }
  });

  it('defines component overrides for MUI components', () => {
    expect(themeOptions.components).toBeDefined();

    const components = themeOptions.components;
    expect(components?.MuiTabs).toBeDefined();
    expect(components?.MuiTab).toBeDefined();
    expect(components?.MuiAccordion).toBeDefined();
    expect(components?.MuiButton).toBeDefined();
    expect(components?.MuiToggleButton).toBeDefined();
  });

  it('configures button hover color to brand gold', () => {
    const buttonStyles = themeOptions.components?.MuiButton?.styleOverrides;
    expect(buttonStyles).toBeDefined();

    // The root hover should have the brand gold color
    const root = buttonStyles.root as Record<string, unknown>;
    const hover = root['&:hover'] as Record<string, string>;
    expect(hover.backgroundColor).toBe('#c59d5f');
  });
});
