# Seating Layout State (Zustand)

**Location**: `apps/wario-pos/src/stores/useSeatingBuilderStore.ts`

**Consumers**: Seating Builder UI in wario-pos, backend API via TanStack Query mutations

## Overview

The seating layout builder uses a **Zustand store** for client-side state management. This replaces the earlier draft design that proposed a class-based `SeatingLayoutStore` in wario-shared.

### Key Design Decisions

1. **Zustand over class-based store**: Better React integration, atomic selectors, and simpler API
2. **Normalized state**: `floorsById`, `sectionsById`, `resourcesById` maps for O(1) lookups
3. **Position merged into resource**: `centerX`, `centerY`, `rotation` are stored directly on `SeatingResource` (no separate placement entity)
4. **Server entity tracking**: `serverEntityIds` Set tracks which entities exist on the backend to distinguish creates from updates

## Data Model

### DTOs (from `wario-shared`)

| DTO                       | Fields                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `SeatingFloorDto`         | `id`, `name`, `ordinal`, `disabled`                                                                                    |
| `SeatingLayoutSectionDto` | `id`, `floorId`, `name`, `ordinal`, `disabled`                                                                         |
| `SeatingResourceDto`      | `id`, `name`, `capacity`, `shape`, `sectionId`, `shapeDimX`, `shapeDimY`, `centerX`, `centerY`, `rotation`, `disabled` |
| `SeatingLayoutDto`        | `id`, `name`, `floors[]`, `sections[]`, `resources[]`                                                                  |

### Store State

```typescript
interface SeatingBuilderState {
  // Normalized layout data
  layout: {
    id: string;
    name: string;
    floorsById: Record<string, SeatingFloor>;
    floorIds: string[];
    sectionsById: Record<string, SeatingLayoutSection>;
    sectionIdsByFloorId: Record<string, string[]>;
    resourcesById: Record<string, SeatingResource>;
    resourceIdsBySectionId: Record<string, string[]>;
  };

  // Editor state
  editor: {
    activeFloorId: string | null;
    activeSectionId: string | null;
    selectedResourceIds: string[];
    gridSize: number;
    snapToGrid: boolean;
  };

  // UI state
  isDirty: boolean;
  originalLayoutId: string | null;
  serverEntityIds: Set<string>;
  interactionMode: 'SELECT' | 'PAN' | 'ADD_TABLE';
}
```

## API

### Loading/Saving

- `loadLayout(layout: SeatingLayout)` – Normalizes API response into store
- `toLayout(): UpsertSeatingLayoutRequest` – Serializes for API, strips `id` from new entities

### CRUD Actions

- `addFloor(name)`, `addSection(floorId, name)`, `addResource(params)`
- `updateResource(id, updates)`, `deleteResources(ids)`
- `rotateResources(ids, degrees)`, `moveResources(ids, dx, dy)`

### Selection

- `selectResources(ids)`, `clearSelection()`
- `setActiveFloor(id)`, `setActiveSection(id)`

## Usage Example

```typescript
import { useSeatingBuilderStore, useFloors, useSelectedResourceIds } from '@/stores/useSeatingBuilderStore';

function SeatingToolbar() {
  const addResource = useSeatingBuilderStore((s) => s.addResource);
  const activeSectionId = useSeatingBuilderStore((s) => s.editor.activeSectionId);
  const selectedIds = useSelectedResourceIds();

  const handleQuickAdd = () => {
    if (!activeSectionId) return;
    addResource({
      sectionId: activeSectionId,
      name: `Table ${Date.now()}`,
      capacity: 4,
      shape: 'RECTANGLE',
      shapeDimX: 40,
      shapeDimY: 30,
    });
  };

  return <Button onClick={handleQuickAdd}>Add Table</Button>;
}
```

## Selector Hooks

Optimized selectors for common access patterns:

| Hook                                 | Returns                            |
| ------------------------------------ | ---------------------------------- |
| `useFloors()`                        | All floors sorted by ordinal       |
| `useSections(floorId)`               | Sections for a floor               |
| `useResourceRenderModels(sectionId)` | Resources with selection state     |
| `useActiveFloorId()`                 | Current floor ID                   |
| `useActiveSectionId()`               | Current section ID                 |
| `useSelectedResourceIds()`           | Selected resource IDs              |
| `useIsDirty()`                       | Whether layout has unsaved changes |
