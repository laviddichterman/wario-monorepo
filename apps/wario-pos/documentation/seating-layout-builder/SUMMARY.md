# Seating Layout Builder - Comprehensive Walkthrough

This document summarizes all work completed on the Seating Layout Builder feature.

## Feature Summary

A touch-optimized floor plan editor enabling FOH managers to configure restaurant layouts with:

- Multiple floors and sections
- Draggable, resizable tables (round/rectangular)
- Full undo/redo with keyboard shortcuts
- API integration for persistence

---

## Completed Features

### 1. Save Flow Fix

Fixed non-functional save using discriminated union pattern for upsert operations.

**Key Changes:**

- Backend `SeatingService.updateLayout()` now uses discriminated unions (with `id` = update, without = create)
- Fixed Mongoose `_id` to `id` mapping in repository layer
- Frontend tracks server-generated IDs in `serverEntityIds` Set
- `toLayout()` strips `id` from new entities

📄 Details: [save-fix walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/walkthrough.md)

---

### 2. Grid Boundary Constraints

Prevents tables from being moved, resized, or rotated outside the canvas (1200×800).

**Key Changes:**

- New `bounding-utils.ts` with shape-aware calculations
- Ellipses use analytical formula for tighter bounds at rotated angles
- Multi-selection aware drag constraints
- 27 unit tests covering all edge cases

📄 Details: [grid-boundaries walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/grid-boundaries/walkthrough.md)

---

### 3. Undo/Redo System

50-level history with keyboard shortcuts.

**Key Changes:**

- Snapshot-based approach storing full layout state
- Actions: `pushUndoCheckpoint`, `undo`, `redo`, `clearHistory`
- Keyboard: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
- Toast notifications with action labels

📄 Details: [undo-redo walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/undo-redo/walkthrough.md)

---

### 4. Delete Functionality

Cascade delete for sections, floors, and layouts with confirmation dialogs.

**Key Changes:**

- Store actions: `deleteSection`, `deleteFloor`, `resetToDefaultLayout`
- Reusable `DeleteConfirmDialog` component
- Cascade warnings showing affected items
- Single undo checkpoint per operation

📄 Details: [delete walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/delete-functionality/walkthrough.md)

---

### 5. Drag Bug Fixes

Fixed direct click-and-drag and wrong-table-moves issues.

**Key Changes:**

- Selection now happens at drag start, not on click
- Drag operations always move the table being dragged
- `DraggableResource` correctly handles unselected items

---

### 6. Unsaved Changes Dialog

Three-way dialog when switching layouts with unsaved changes.

**Key Changes:**

- New `UnsavedChangesDialog` component
- Options: Discard, Cancel, Save & Switch
- Query invalidation after save ensures correct layout loads

---

### 7. Lasso Selection

Rectangle-drag multi-select with Shift-additive support.

**Key Changes:**

- `handlePointerDown` in `SeatingCanvas` detects background clicks
- Live selection rectangle with visual feedback
- Shift-drag adds to existing selection
- Click vs drag threshold (2 units) prevents accidental deselect
- Strict ID checking prevents drag-lasso conflict

📄 Details: [lasso-selection implementation](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/lasso-selection/implementation_plan.md)

---

### 8. Save Failure Fix (DTO Validation)

Fixed save failures when adding new floors/sections/tables.

**Key Changes:**

- Updated `CreateSeatingLayoutRequestDto` to use `IsUpsert...Array` decorators
- Validator properly discriminates create (no `id`) vs update (with `id`)
- Backend `createLayout` updated with type guards for union types
- Added comprehensive unit tests for upsert validation

📄 Details: [fix-save-failure walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/fix-save-failure/walkthrough.md)

---

### 9. Drag-Lasso Conflict Fix

Prevented lasso tool from triggering when dragging tables.

**Key Changes:**

- Added `id="seating-canvas-bg"` and `id="seating-canvas-grid"` to `GridBackground` rects
- Updated `handlePointerDown` to only trigger lasso on specific background IDs
- Removed generic `tagName === 'rect'` check
- Added E2E test to verify tables can be dragged without triggering lasso

---

## File Structure

```
src/sections/seating/
├── SeatingBuilderView.tsx    # Main view, layout switching
├── SeatingCanvas.tsx         # SVG canvas, drag/lasso handling
├── SeatingToolbar.tsx        # Toolbar with undo/redo/save
├── FloorSelector.tsx             # Floor navigation
├── SectionTabs.tsx           # Section navigation
├── components/
│   ├── DraggableResource.tsx # Table with resize handles
│   ├── DeleteConfirmDialog.tsx
│   ├── UnsavedChangesDialog.tsx
│   ├── TableEditDialog.tsx
│   ├── TableVisual.tsx
│   ├── GridBackground.tsx    # Grid with background IDs
│   └── ResizeHandles.tsx
└── utils/
    ├── bounding-utils.ts     # Canvas boundary calculations
    └── bounding-utils.test.ts

src/stores/
└── useSeatingBuilderStore.ts # Zustand store with undo/redo

src/hooks/
└── useSeatingLayoutQuery.ts  # TanStack Query mutations
```

---

## Verification Results

| Area                | Status                           |
| ------------------- | -------------------------------- |
| Backend build       | ✅ Pass                          |
| Frontend type-check | ✅ Pass                          |
| Shared unit tests   | ✅ 419 tests passing             |
| No `console.log`    | ✅ Verified                      |
| No TODOs/FIXMEs     | ✅ Verified                      |
| AGENT_GUIDE updated | ✅ Added Seating Builder section |

---

## Remaining Work

- [x] Multi-select via lasso/drag-selection box _(Completed - see §7)_
- [x] Bulk move with grid snapping _(Completed - implemented in drag handlers)_
- [x] Floor/section rename and UI consistency _(Completed - see [walkthrough](file:///Users/lavid/Documents/wario-monorepo/apps/wario-pos/documentation/seating-layout-builder/naming-ui-consistency/walkthrough.md))_
- [ ] Complete E2E tests for lasso selection
- [ ] Improve touch targets for resize handles
- [ ] Table template presets
- [ ] Performance profiling for 50+ tables
