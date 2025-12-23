import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Extended test fixture with common utilities for wario E2E tests.
 */

export interface WarioTestFixtures {
  /** Wait for socket data to load (loading screen to disappear) */
  waitForSocketData: (page: Page) => Promise<void>;
}

export const test = base.extend<WarioTestFixtures>({
  waitForSocketData: async ({}, use) => {
    const waitFn = async (page: Page) => {
      // Wait for loading screen to disappear and main content to appear
      await page.waitForSelector('[id="WARIO_order"]', {
        state: 'visible',
        timeout: 30000,
      });
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(waitFn);
  },
});

export { expect };

/**
 * Helper to check if we're running in integration mode.
 */
export const isIntegrationMode = () => process.env.E2E_MODE === 'integration';

/**
 * Skip test if not in integration mode.
 */
export const skipIfMocked = () => {
  if (!isIntegrationMode()) {
    test.skip();
  }
};

/**
 * Skip test if in integration mode.
 */
export const skipIfIntegration = () => {
  if (isIntegrationMode()) {
    test.skip();
  }
};
