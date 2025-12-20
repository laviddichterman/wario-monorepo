import { defineConfig, devices } from '@playwright/test';
import { PORT as ORDER_PORT } from './apps/wario-fe-order/vite.config';
import { PORT as POS_PORT } from './apps/wario-pos/vite.config';
import { PORT as CREDIT_PORT } from './apps/wario-fe-credit/vite.config';
import { PORT as MENU_PORT } from './apps/wario-fe-menu/vite.config';
import { PORT as FAQ_PORT } from './apps/wario-fe-faq/vite.config';

/**
 * Playwright configuration for wario monorepo E2E tests.
 *
 * Supports two modes:
 * - MOCKED: Tests with mocked WebSocket/API data (default, fast, isolated)
 * - INTEGRATION: Tests against a live/staging backend
 *
 * Usage:
 *   pnpm e2e              # Run all tests with mocked data
 *   pnpm e2e:integration  # Run integration tests against live backend
 *   pnpm e2e:ui           # Interactive UI mode
 */

const isIntegration = process.env.E2E_MODE === 'integration';

// App port mappings (from vite.config.ts files)
const APP_PORTS = {
  order: ORDER_PORT,
  credit: CREDIT_PORT,
  menu: MENU_PORT,
  pos: POS_PORT,
  faq: FAQ_PORT,
} as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // wario-fe-order tests
    {
      name: 'order-chromium',
      testDir: './e2e/order',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${APP_PORTS.order}`,
      },
    },
    {
      name: 'order-firefox',
      testDir: './e2e/order',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: `http://localhost:${APP_PORTS.order}`,
      },
    },
    {
      name: 'order-webkit',
      testDir: './e2e/order',
      use: {
        ...devices['Desktop Safari'],
        baseURL: `http://localhost:${APP_PORTS.order}`,
      },
    },

    // wario-pos tests
    {
      name: 'pos-chromium',
      testDir: './e2e/pos',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${APP_PORTS.pos}`,
      },
    },

    // wario-fe-credit tests
    {
      name: 'credit-chromium',
      testDir: './e2e/credit',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${APP_PORTS.credit}`,
      },
    },

    // wario-fe-menu tests
    {
      name: 'menu-chromium',
      testDir: './e2e/menu',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${APP_PORTS.menu}`,
      },
    },

    // wario-fe-faq tests
    {
      name: 'faq-chromium',
      testDir: './e2e/faq',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${APP_PORTS.faq}`,
      },
    },
  ],

  // Start dev servers before running tests (only for mocked mode)
  // For integration mode, servers should already be running
  ...(isIntegration
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm order:dev',
            url: `http://localhost:${APP_PORTS.order}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
          },
          {
            command: 'pnpm pos:dev',
            url: `http://localhost:${APP_PORTS.pos}`,
            reuseExistingServer: !process.env.CI,
            timeout: 120000,
            env: {
              VITE_AUTH_SKIP: 'true',
            },
          },
        ],
      }),
});
