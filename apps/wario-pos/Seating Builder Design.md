# Seating Layout Builder - Architectural Blueprint

> Touch-Optimized Store Seating Configuration Builder for Tablet Devices

## 1. Executive Summary

The hospitality industry demands high-velocity service in dynamic physical environments. This document details the architecture for a touch-optimized seating configuration builder designed for tablet devices, interfacing with the `SeatingLayout` API in the wario-backend.

**Key Technologies**: React, SVG, Zustand, dnd-kit

**Performance Target**: 60 FPS with 500+ interactive elements

## 2. User Experience Architecture

### 2.1 Touch Input Considerations

| Constraint                               | Solution                              |
| ---------------------------------------- | ------------------------------------- |
| Finger contact area (~1.6–2 cm)          | Minimum 48x48px touch targets         |
| Dense layouts risk accidental activation | 12px minimum spacing between elements |
| No distinct "click" vs "drag" states     | Gesture-based disambiguation          |

### 2.2 Gesture Disambiguation

| Gesture       | Trigger                          | Action                       |
| ------------- | -------------------------------- | ---------------------------- |
| **Pan**       | Single-finger drag on background | Move viewport                |
| **Zoom**      | Two-finger pinch                 | Scale viewport               |
| **Selection** | Quick tap on table               | Toggle selection             |
| **Move/Drag** | Long press (200-300ms)           | Unlock position for dragging |
| **Edit**      | Double-tap on table              | Open edit dialog             |

### 2.3 Quick-Add Workflow

The toolbar provides two quick-add buttons for rapid layout creation:

- **Round Button** (Circle icon): Creates 80×80 circular table, capacity 2
- **Square Button** (Square icon): Creates 80×80 rectangular table, capacity 2

Tables are auto-named sequentially ("Table 1", "Table 2", etc.) and placed in the first available grid position.

### 2.4 Visual Feedback States

| State            | Visual Indicator                                |
| ---------------- | ----------------------------------------------- |
| Idle             | Flat design, neutral stroke                     |
| Selected         | Blue thickened stroke, 4 corner resize handles  |
| Dragging         | Elevation shadow, slight transparency           |
| Resizing         | Dashed outline, dimension tooltip               |
| Snapping         | Dynamic guidelines, magnetic pull               |
| Inactive Section | Opacity 0.4, gray stroke, interactions disabled |
| Invalid          | Red tint, "shake" animation                     |

### 2.5 Multi-Section Visibility

All sections on the active floor render simultaneously:

- **Active section**: Fully interactive with normal styling
- **Inactive sections**: Grayed out (opacity 0.4), interactions disabled

### 2.6 Navigation UI

```
Layout → Floors → Sections → Tables
```

| Level   | UI Component                                                 |
| ------- | ------------------------------------------------------------ |
| Layout  | Dropdown with saved layouts + "New" button                   |
| Floor   | Dropdown with floors + "Add Floor..." option                 |
| Section | Horizontal chip group (filled = active, outlined = inactive) |

## 3. Rendering Engine

### 3.1 SVG vs Canvas Decision

**Selected: Optimized SVG** for layouts of 50–500 elements.

| Aspect        | SVG Advantage                |
| ------------- | ---------------------------- |
| Interactivity | Standard DOM event listeners |
| Styling       | CSS styling, easy theming    |
| Scaling       | Vector-based, no pixelation  |
| Accessibility | Screen reader compatible     |

### 3.2 Performance Optimizations

1. **Virtualization**: Viewport culling renders only visible elements
2. **Memoization**: `React.memo` with specific prop dependencies
3. **Hardware Acceleration**: `transform: translate3d()` for GPU compositing
4. **Passive Listeners**: Non-blocking touch event handlers

### 3.3 Scene Graph Layers

| Layer            | Contents                                   |
| ---------------- | ------------------------------------------ |
| 0 (Background)   | Static grid and floor textures             |
| 1 (Architecture) | Walls, windows, fixed obstacles            |
| 2 (Furniture)    | Tables, booths (primary interactive layer) |
| 3 (Decor)        | Plants, POS terminals                      |
| 4 (Overlay)      | Selection handles, drag previews           |

## 4. State Management

### 4.1 Technology Choice: Zustand

Selected over Redux/Context for:

- High-frequency drag updates (16ms intervals)
- Atomic selectors preventing unnecessary re-renders
- O(1) rendering relative to object count

### 4.2 Data Model

```typescript
interface SeatingResource {
  id: string;
  name: string;
  sectionId: string;
  capacity: number;
  shape: 'RECTANGLE' | 'ELLIPSE';
  shapeDimX: number; // Half-width (rect) or x-radius (ellipse)
  shapeDimY: number; // Half-height (rect) or y-radius (ellipse)
  centerX: number; // X coordinate of center
  centerY: number; // Y coordinate of center
  rotation: number; // Degrees, clockwise from 0
  disabled: boolean;
}
```

### 4.3 Store Structure

```typescript
interface SeatingBuilderState {
  layout: {
    id: string;
    name: string;
    floorsById: Record<string, SeatingFloor>;
    sectionsById: Record<string, SeatingLayoutSection>;
    resourcesById: Record<string, SeatingResource>;
    // Index arrays for ordering
    floorIds: string[];
    sectionIdsByFloorId: Record<string, string[]>;
    resourceIdsBySectionId: Record<string, string[]>;
  };
  editor: {
    activeFloorId: string | null;
    activeSectionId: string | null;
    selectedResourceIds: string[];
    gridSize: number;
    snapToGrid: boolean;
  };
  isDirty: boolean;
  interactionMode: 'SELECT' | 'PAN' | 'ADD_TABLE';
}
```

### 4.4 Optimistic UI Pattern

1. **Immediate Feedback**: Local store updates instantly
2. **Background Sync**: API requests debounced (500-1000ms)
3. **Rollback**: Reverts on server error with toast notification

## 5. Component Architecture

### 5.1 Compound Component Pattern

Separates interaction logic from visual representation.

#### Dumb (Presentational) Component

```tsx
const TableVisual = React.memo(({ width, height, shape, fill, stroke, isSelected, label }) => {
  const strokeColor = isSelected ? '#007AFF' : stroke;
  const strokeWidth = isSelected ? 3 : 1;
  // SVG rendering...
});
```

#### Smart (Container) Component

```tsx
const DraggableResource = ({ id }) => {
  const resource = useSeatingBuilderStore((s) => s.layout.resourcesById[id]);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  return (
    <g ref={setNodeRef} transform={`translate(${x}, ${y})`} {...listeners}>
      <TableVisual {...resource} isSelected={resource.selected} />
      {resource.selected && <ResizeHandles resourceId={id} />}
    </g>
  );
};
```

### 5.2 Resize Handles

Four corner anchor circles appear on selection:

```tsx
const ResizeHandles = ({ resourceId, width, height }) => {
  const corners = [
    { x: -width / 2, y: -height / 2, cursor: 'nwse-resize' },
    { x: width / 2, y: -height / 2, cursor: 'nesw-resize' },
    { x: -width / 2, y: height / 2, cursor: 'nesw-resize' },
    { x: width / 2, y: height / 2, cursor: 'nwse-resize' },
  ];
  return corners.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={8} fill="#007AFF" cursor={c.cursor} />);
};
```

### 5.3 Table Edit Dialog

Double-tap opens inline dialog with:

- Name (TextField)
- Capacity (NumberField)
- Shape (Select: Round/Square)
- Width/Height (NumberFields)

## 6. Interaction Algorithms

### 6.1 Magnetic Grid Snapping

Position snaps when near grid line:

```
x' = round(x / G) × G  if |x mod G| < T or |x mod G| > G - T
x' = x                  otherwise
```

Where `G` = grid size, `T` = snap threshold.

### 6.2 Multi-Selection (Lasso)

- **Hit Testing**: AABB (Axis-Aligned Bounding Box) intersection
- **Performance**: Spatial hash reduces complexity to near O(1)
- **Group Dragging**: Delta vector applied to all selected items

### 6.3 Temporary Table Merging

For large parties, tables can be logically joined:

1. Validate physical proximity via AABB collision
2. Create parent-child relationship
3. Calculate combined capacity: `C_total = ΣC_tables - L_loss`
4. Render wrapper around merged group bounds

## 7. API Integration

### Endpoints

| Method | Endpoint                            | Purpose                      |
| ------ | ----------------------------------- | ---------------------------- |
| GET    | `/api/v1/config/seating-layout`     | List all layouts             |
| GET    | `/api/v1/config/seating-layout/:id` | Get layout with all entities |
| POST   | `/api/v1/config/seating-layout`     | Create new layout            |
| PATCH  | `/api/v1/config/seating-layout/:id` | Update layout                |
| DELETE | `/api/v1/config/seating-layout/:id` | Delete layout                |

### Integration Patterns

- **Batching**: Updates sent on `onDragEnd`, not during movement
- **Debouncing**: 500-1000ms delay before sync
- **Optimistic Updates**: Immediate UI update, rollback on error

## 8. Performance Optimization

### 8.1 Layout Thrashing Prevention

- Separate DOM reads from writes
- Wrap visual updates in `requestAnimationFrame`

### 8.2 Event Throttling

- Throttle drag handlers to 60Hz refresh rate
- Use `{ passive: true }` for touch listeners

### 8.3 Hybrid Rendering (Escape Hatch)

For layouts with 2000+ seats:

- Static elements (walls/floors) → HTML5 Canvas
- Interactive furniture → SVG

## 9. Files

| File                                                | Purpose                             |
| --------------------------------------------------- | ----------------------------------- |
| `stores/useSeatingBuilderStore.ts`                  | Zustand store with normalized state |
| `sections/seating/SeatingBuilderView.tsx`           | Main view container                 |
| `sections/seating/SeatingCanvas.tsx`                | SVG canvas with dnd-kit             |
| `sections/seating/SeatingToolbar.tsx`               | Quick-add, rotate, delete actions   |
| `sections/seating/components/DraggableResource.tsx` | Interactive table wrapper           |
| `sections/seating/components/TableVisual.tsx`       | Dumb table renderer                 |
| `sections/seating/components/ResizeHandles.tsx`     | Corner resize anchors               |
| `sections/seating/components/TableEditDialog.tsx`   | Edit dialog                         |
| `hooks/useSeatingLayoutQuery.ts`                    | TanStack Query mutations            |
