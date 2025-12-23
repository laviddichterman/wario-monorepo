import { expect, test } from '../fixtures/base';

test.describe('Seating Layout Lasso Selection', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log('PAGE LOG:', msg.text());
    });
    page.on('requestfailed', (request) => {
      console.log('FAILED REQUEST:', request.url(), request.failure()?.errorText);
    });

    // Mock the seating layouts API (list and individual)
    await page.route(/\/api\/v1\/config\/seating-layout/, async (route) => {
      const url = route.request().url();
      if (url.endsWith('/seating-layout')) {
        // List
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'layout-1',
              name: 'Mock Layout',
              floors: [{ id: 'floor-1', name: 'Mock Floor', ordinal: 0, disabled: false }],
              sections: [{ id: 'section-1', floorId: 'floor-1', name: 'Mock Section', ordinal: 0, disabled: false }],
              resources: [],
            },
          ]),
        });
      } else {
        // Individual layout (layout-1)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'layout-1',
            name: 'Mock Layout',
            floors: [{ id: 'floor-1', name: 'Mock Floor', ordinal: 0, disabled: false }],
            sections: [{ id: 'section-1', floorId: 'floor-1', name: 'Mock Section', ordinal: 0, disabled: false }],
            resources: [], // Start empty
          }),
        });
      }
    });

    // Navigate to POS dashboard
    await page.goto('/dashboard');

    // Navigate to Seating Builder
    await page.goto('/dashboard/seating-builder');

    // Waiting for canvas to be ready
    await page.waitForSelector('svg');
  });

  test('should select multiple tables when dragging on empty grid', async ({ page }) => {
    // 1. Add tables via the toolbar
    // Located via icon since aria-label might not be set directly on button
    const addRoundTableBtn = page.locator('button:has([data-testid="CircleOutlinedIcon"])');
    const addSquareTableBtn = page.locator('button:has([data-testid="SquareOutlinedIcon"])');

    // Add 3 tables. They should appear in default positions (staggered or grid finding).
    // Store logic finds available position.
    await addRoundTableBtn.click();
    await addRoundTableBtn.click();
    await addSquareTableBtn.click();

    // Wait for tables to appear
    const tables = page.locator('#resources-layer .resource-layer');
    await expect(tables).toHaveCount(3);

    // 2. Perform Lasso Drag
    // We want to drag around the area where tables are added.
    // Default add position starts at (100, 100) and finds next spot.
    // It likely places them near (100, 100), (100+grid, 100), etc.
    // So dragging from (0,0) to (500,500) should cover them.

    const canvas = page.locator('svg').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Start drag from empty space relative to canvas
    const startX = box.x + 10;
    const startY = box.y + 10;
    await page.mouse.move(startX, startY);

    // Debug what we are clicking
    await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        console.log('Element at', x, y, 'is', el?.tagName, el?.className, el?.id);
      },
      { x: startX, y: startY },
    );

    await page.mouse.down();

    // Drag to encompass tables
    await page.mouse.move(box.x + 500, box.y + 500, { steps: 10 });

    // Assert visual feedback (blue rect) exists
    const lassoRect = canvas.locator('rect[stroke="rgba(33, 150, 243, 0.8)"]');
    await expect(lassoRect).toBeVisible();

    // Release
    await page.mouse.up();

    // Assert lasso rect gone
    await expect(lassoRect).not.toBeVisible();

    // Assert selection
    // Selected tables show resize handles or specific styling.
    // In SeatingCanvas, selected tables have `isSelected` true in model.
    // Visual: the `<DraggableResource>` renders `<ResizeHandles>` if selected.
    // Check if resize handles exist.
    // Check if resize handles exist.
    // checking logic: in DraggableResource, ResizeHandles component is rendered conditionally.
    // ResizeHandles.tsx likely doesn't have testid yet.
    // But DraggableResource passes `isSelected` to TableVisual.
    // Let's check if we can verify selection via UI cues.
    // Maybe check the "Delete Selected" button in toolbar is enabled?
    // Toolbar: `disabled={!hasSelection}`.

    const deleteBtn = page.locator('button:has([data-testid="DeleteIcon"])');
    await expect(deleteBtn).toBeEnabled();
  });

  test('should NOT trigger lasso when dragging a table', async ({ page }) => {
    // 1. Add a table
    const addRoundTableBtn = page.locator('button:has([data-testid="CircleOutlinedIcon"])');
    await addRoundTableBtn.click();

    // 2. Locate the table
    const table = page.locator('#resources-layer .resource-layer').first();
    await expect(table).toBeVisible();

    // 3. Get table centroid for drag start
    const box = await table.boundingBox();
    if (!box) throw new Error('Table not found');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // 4. Perform Drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 100, { steps: 10 });

    // 5. Assert NO lasso rect visible
    const canvas = page.locator('svg').first();
    const lassoRect = canvas.locator('rect[stroke="rgba(33, 150, 243, 0.8)"]');
    await expect(lassoRect).not.toBeVisible();

    // 6. Release
    await page.mouse.up();
  });
});
