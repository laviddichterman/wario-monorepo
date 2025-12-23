import type { Page, Route } from '@playwright/test';

// Import mock factories from wario-shared/testing
// This is a separate entry point that won't bloat production bundles
import { createMockCatalog } from '@wcp/wario-shared/testing';

/**
 * WebSocket and API mocking utilities for E2E tests.
 *
 * These helpers allow tests to run without a live backend by intercepting
 * WebSocket connections and API calls.
 */

export interface MockSocketOptions {
  /** Initial catalog data to send */
  catalogData?: Record<string, unknown>;
  /** Initial settings data to send */
  settingsData?: Record<string, unknown>;
  /** Delay before sending initial data (ms) */
  initialDelay?: number;
}

/**
 * Mock catalog data for testing using wario-shared factories.
 * Extend as needed for specific tests.
 */
export const MOCK_CATALOG_DATA = createMockCatalog();

/**
 * Setup API route interception for mocked tests.
 * Intercepts common API endpoints and returns mock data.
 */
export async function setupApiMocks(
  page: Page,
  options: {
    catalogData?: Record<string, unknown>;
  } = {},
) {
  // Mock catalog endpoint
  await page.route('**/api/catalog**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(options.catalogData ?? MOCK_CATALOG_DATA),
    });
  });

  // Mock settings endpoint
  await page.route('**/api/settings**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

/**
 * Wait for a specific socket event to be received.
 * Useful for integration tests where we need to wait for real data.
 */
export async function waitForSocketEvent(page: Page, eventName: string, timeout = 30000): Promise<void> {
  await page.evaluate(
    ({ eventName, timeout }) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for socket event: ${eventName}`));
        }, timeout);

        // This assumes the app exposes socket on window for testing
        // You may need to adjust based on your actual implementation
        const checkSocket = () => {
          const win = window as unknown as { __testSocket?: { once: (event: string, cb: () => void) => void } };
          if (win.__testSocket) {
            win.__testSocket.once(eventName, () => {
              clearTimeout(timer);
              resolve();
            });
          } else {
            setTimeout(checkSocket, 100);
          }
        };
        checkSocket();
      });
    },
    { eventName, timeout },
  );
}
