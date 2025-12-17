# Seating Layout Store (Draft)

**Environment**: `wario-pos` (tablet-first, touch), `wario-backend` config APIs, shared domain types in `@wcp/wario-shared`.

**Problem statement**: Front-of-house manager configures a restaurant’s table layout (floors → sections → tables) and later reuses the same layout for a live “table status” view; edits must be fast, safe, and portable across contexts.

**Primary users**: FOH manager doing initial setup; shift lead making quick adjustments; staff viewing table/order status during service.

**Success metric**: Configure a typical section (≈30 tables) in ≤5 minutes on an iPad-class tablet, with near-zero accidental moves (undoable operations; snap-to-grid reduces misalignment).

## Inventory (What This Doc Covers)

**Components**

- `SeatingLayoutStore` (pure, environment-agnostic state container): `packages/wario-shared/src/lib/objects/SeatingLayoutStore.ts`
- DTOs/types for layout persistence: `packages/wario-shared/src/lib/dto/seating.dto.ts`
- Derived types (frontend-safe): `packages/wario-shared/src/lib/derived-types.ts`

**Flows**

- Builder: Load layout → select tables → move (snap) → save layout
- Viewer: Load layout → overlay allocations from orders → render table statuses (no persistence)
- “Push tables together”: assign one order to multiple table IDs (derived from order seating data, not stored on tables)

**States**

- Empty layout (no floors/sections/resources)
- Loading/error (handled by callers; store is in-memory only)
- Dirty vs saved (`mtime` on layout state; future: undo/redo stack)
- Disabled entities (floors/sections/resources)

**Tokens / knobs**

- `gridSize` (snap spacing, layout units)
- `snapToGrid` (on/off)
- Rotation degrees (stored; snapping TBD)

## Overview

`SeatingLayoutStore` is a **pure TypeScript, object-oriented data store** that:

- Normalizes a seating layout (floors/sections/resources/placements) into lookup maps for fast access.
- Keeps **editor-only state** (selection, active floor/section, snap settings) separate from the persisted layout.
- Accepts **runtime overlays** (order allocations) without mutating persisted layout data.
- Produces “dumb” render models (`SeatingResourceRenderModel`) suitable for a reusable table renderer.

### Where It’s Used

- Builder UI: holds local interactive state (selection + movement) and outputs the persisted `SeatingLayout`.
- Live status UI: holds persisted layout + overlays (allocations) to render occupancy/status, without persisting allocations.

## Data Model

### Persisted Layout (`SeatingLayout`)

From `packages/wario-shared/src/lib/dto/seating.dto.ts`:

- `SeatingFloorDto`: `{ id, name, ordinal, disabled }`
- `SeatingLayoutSectionDto`: `{ id, floorId, name, ordinal, disabled }`
- `SeatingResourceDto`: `{ id, name, capacity, shape, sectionId, shapeDimX, shapeDimY, disabled }`
- `SeatingPlacementDto`: `{ id, name, sectionId, centerX, centerY, rotation }`
- `SeatingLayoutDto`: `{ schemaVersion, id, name, floors, sections, resources, placements, mtime, validFrom?, validTo? }`

### Store State (`SeatingLayoutStoreState`)

From `packages/wario-shared/src/lib/objects/SeatingLayoutStore.ts`:

- `layout`: normalized maps + ordering arrays (fast lookups)
- `editor`: active floor/section, selection, snap config
- `overlays`: allocation maps (derived from orders)

## API Surfaces

### Constructors / Serialization

- `SeatingLayoutStore.Empty()` → empty store with default editor settings
- `SeatingLayoutStore.FromLayout(layout)` → normalize a persisted layout into store form
- `store.ToLayout()` → emit the persisted `SeatingLayout` shape for saving

### Builder (Selection / Movement)

- `store.SelectResources(ids, mode)` where `mode ∈ { replace, add, remove, toggle }`
- `store.MoveSelection(dx, dy, { snapToGrid? })`
- `SnapToGrid(value, gridSize)` helper

### Editing (Create)

- `store.AddFloor({ name, ... })`
- `store.AddSection({ floorId, name, ... })`
- `store.AddResource({ sectionId, name, shape, dims, ... })`

### Viewer (Order Overlays)

- `store.WithAllocations([{ orderId, seating }])`
- `store.ResourceRenderModels(sectionId)` → includes `allocation?` per resource

## Behavior Notes

- **Pure / environment-agnostic**: no DOM, no React, no network calls; designed to run in Node and browser.
- **Allocation overlay**: derived from order seating data and stored separately from layout config.
- **Snap-to-grid**: applied on `MoveResources/MoveSelection` when enabled.
- **Safety**: current methods are immutable-returning (new store instances), enabling easy undo/redo integration later.

## Examples

### Happy Path (Builder)

1. `store = SeatingLayoutStore.Empty()`
2. `store = store.AddFloor({ name: 'Main' })`
3. `store = store.AddSection({ floorId, name: 'Dining Room' })`
4. `store = store.AddResource({ sectionId, name: 'T1', capacity: 4, shape: 'RECTANGLE', shapeDimX: 30, shapeDimY: 20, centerX: 100, centerY: 100 })`
5. `store = store.SelectResources(['<T1-id>'])`
6. `store = store.MoveSelection(12, 0)` (snaps based on `gridSize`)
7. `layoutToSave = store.ToLayout()`

### Edge Case (Joined Tables From Orders)

- An order with `seating.tableId = ['T1', 'T2']` implies “pushed-together” tables for that order.
- Call `store.WithAllocations([{ orderId, seating }])` and render both tables with the same allocation metadata.

## Known Limitations / Next Questions

- TODO: Confirm persistence strategy for `SeatingLayoutDto` (new table vs key-value config vs settings) and how SCD2 validity is modeled.
- TODO: Define rotation snapping (e.g., 15° increments) and whether snapping is applied continuously or on drag end.
- TODO: Confirm whether `SeatingPlacementDto` should continue duplicating `name/sectionId` (currently mirrored from `SeatingResourceDto` in store).
- Needs product/eng confirmation @owner TBD: How should multi-floor navigation work on tablet (tabs vs drawer) and how is “active section” chosen on load?
