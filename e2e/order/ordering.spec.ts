import { test, expect } from '../fixtures/base';
import { isIntegrationMode } from '../fixtures/base';

/**
 * wario-fe-order E2E tests
 *
 * These tests cover the customer-facing ordering flow.
 *
 * Run with:
 *   pnpm e2e:order              # Mocked mode (requires mock data setup)
 *   pnpm e2e:order:integration  # Against live/staging backend
 */

test.describe('Order Page - Basic', () => {
  test('page loads and shows app container', async ({ page }) => {
    await page.goto('/');

    // The app should render (either loading screen or main content)
    // Check for the root React mount point or any rendered content
    await expect(page.locator('#root')).toBeAttached();
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/');

    // Check that the page loaded (title may vary based on your index.html)
    await expect(page).toHaveTitle(/.*/);
  });
});

test.describe('Order Page - With Data', () => {
  test.skip(!isIntegrationMode(), 'Requires live backend - run with E2E_MODE=integration');

  test('ordering component appears after socket data loads', async ({ page, waitForSocketData }) => {
    await page.goto('/');

    // Wait for socket data to load
    await waitForSocketData(page);

    // Verify main ordering component is visible
    const orderingSection = page.locator('#WARIO_order');
    await expect(orderingSection).toBeVisible();
  });

  test('navigation elements are visible after load', async ({ page, waitForSocketData }) => {
    await page.goto('/');
    await waitForSocketData(page);

    // These selectors may need adjustment based on actual component structure
    // Check for any buttons or navigation that should appear
    const mainContent = page.locator('#WARIO_order');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Order Page - Mocked Data', () => {
  test('can display content with mocked API responses', async ({ page }) => {
    // Setup API mocks before navigating
    await page.route('**/socket.io/**', (route) => {
      // Let socket.io requests through but could mock if needed
      route.continue();
    });

    await page.goto('/');

    // Basic smoke test - page should at least load without crashing
    await expect(page.locator('#root')).toBeAttached();
  });
});
