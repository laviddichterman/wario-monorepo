---
description: How to run and write E2E tests with Playwright
---

# E2E Testing Workflow

## Quick Start

// turbo

1. Install Playwright browsers (first time only):

```bash
pnpm exec playwright install
```

2. Run all E2E tests (mocked mode):

```bash
pnpm e2e
```

3. Run tests for a specific app:

```bash
pnpm e2e:order           # wario-fe-order only
pnpm e2e --project=pos-chromium  # wario-pos only
```

## Test Modes

### Mocked Mode (Default)

Tests run with mocked API/WebSocket data. Fast and isolated.

```bash
pnpm e2e
```

### Integration Mode

Tests run against a live or staging backend. Requires backend to be running.

```bash
pnpm e2e:integration
pnpm e2e:order:integration
```

## Interactive Development

### UI Mode

Interactive test runner with time-travel debugging:

```bash
pnpm e2e:ui
```

### Codegen

Record actions in the browser to generate test code:

```bash
pnpm e2e:codegen http://localhost:3000
```

## Writing Tests

### Directory Structure

```
e2e/
├── fixtures/base.ts     # Shared test fixtures
├── utils/socket-mock.ts # WebSocket mocking helpers
├── order/               # wario-fe-order tests
├── pos/                 # wario-pos tests
├── credit/              # wario-fe-credit tests
├── menu/                # wario-fe-menu tests
└── faq/                 # wario-fe-faq tests
```

### Example Test

```typescript
import { test, expect } from '../fixtures/base';

test('page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
```

### Mode-Specific Tests

```typescript
import { test, expect, isIntegrationMode } from '../fixtures/base';

test.describe('Integration only', () => {
  test.skip(!isIntegrationMode(), 'Requires live backend');

  test('fetches real data', async ({ page }) => {
    // This test only runs in integration mode
  });
});
```

## View Test Results

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

## Debugging Failed Tests

1. Run with headed browser: `pnpm e2e --headed`
2. Run in debug mode: `pnpm e2e --debug`
3. Check screenshots in `test-results/` folder
4. View traces: `pnpm exec playwright show-trace <path-to-trace.zip>`
