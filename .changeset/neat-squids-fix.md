---
'@wcp/wario-backend': minor
'@wcp/wario-pos': minor
'@wcp/wario-shared': minor
---

## Backend Architecture Refactor

Major directory restructure of `wario-backend` for better separation of concerns:

- **Domain Layer** (`src/domain/`): Business logic moved from `src/config/` including `order-manager/`, `order-payment/`, `order-notification/`, `order-calendar/`, `third-party-order/`
- **Infrastructure Layer** (`src/infrastructure/`): Database, messaging, and printing concerns isolated
- **Modules Reorganization**: Created dedicated modules for `DataProvider`, `Integrations` (Square, Google), `DatabaseManager`, `CatalogProvider`, `Seating`
- **Repository Pattern**: Full repository abstraction with interfaces and Mongoose/TypeORM implementations for dual-database operation

## Seating Layout Builder (New Feature)

Complete touch-optimized seating configuration UI for tablet devices:

### Data Model

- **Simplified Model**: Merged `SeatingPlacement` into `SeatingResource` - position fields (`centerX`, `centerY`, `rotation`) now stored directly on resources
- **New Entities**: `SeatingFloorEntity`, `SeatingSectionEntity`, `SeatingLayoutEntity` for PostgreSQL
- **Updated Schemas**: Mongoose schemas for seating floor, layout, section, and resource

### Backend

- **SeatingService**: Full CRUD with cascade delete for floors → sections → resources
- **Controllers**: `SeatingLayoutController`, `SeatingFloorController`, `SeatingSectionController`, `SeatingResourceController`
- **Repositories**: Interface-based repositories with Mongoose and TypeORM implementations

### Frontend (wario-pos)

- **Zustand Store**: `useSeatingBuilderStore` with normalized state, atomic selectors, and optimistic updates
- **TanStack Query Hooks**: `useSeatingLayoutQuery`, `useCreateSeatingLayoutMutation`, `useUpdateSeatingLayoutMutation`
- **UI Components**:
  - `SeatingBuilderView` - Main container with layout/floor/section navigation
  - `SeatingCanvas` - SVG canvas with dnd-kit drag-and-drop, pan/zoom
  - `SeatingToolbar` - Quick-add round/square tables, rotate, delete
  - `DraggableResource` - Interactive table with selection/drag
  - `ResizeHandles` - Corner anchors for drag-to-resize
  - `TableEditDialog` - Edit name, capacity, shape, dimensions
  - `TableVisual` - Dumb renderer for rectangle/ellipse tables

### UX Features

- Quick-add buttons for round/square tables
- Grid snapping for precise placement
- Multi-section visibility (inactive sections grayed out)
- Double-tap to edit, long-press to drag
- Four corner resize handles on selection

## Integration Modules

- **GoogleModule**: Extracted from monolithic config into dedicated module
- **SquareModule**: Isolated with improved mock patterns for testing
- **DataProviderModule**: Proper dependency injection chain for initialization order

## E2E Testing Improvements

- **Centralized Config**: `e2e-config.ts` for dedicated test database settings
- **E2E Helpers**: `createE2EClient()`, `overrideE2EAuth()` utilities
- **New Tests**: `order.e2e-spec.ts` for order workflow testing

## DTO Enhancements

- **Upsert Pattern**: `IsUpsertArray` and `IsUpsertProductArray` custom validators for discriminating create vs update based on `id` presence
- **Seating DTOs**: `CreateSeatingLayoutRequestDto`, `UpdateSeatingLayoutRequestDto`, and upsert types for floors, sections, resources

## Breaking Changes

- `SeatingPlacementDto` removed - use `SeatingResourceDto.centerX/centerY/rotation`
- `SeatingLayoutDto.placements` removed - position data now in `resources`
- `SEATING_PLACEMENT_REPOSITORY` removed
- Backend directory structure changed (imports may need updating)
