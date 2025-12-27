# @wcp/wario-backend

## 0.7.0

### Minor Changes

- b040a6d: ### Breaking Changes
  - `deleteProductInstance` now requires `productId` parameter in addition to `productInstanceId`
  - `batchUpsertProduct` now throws `Error` instead of returning `null` for validation failures

  ### Improvements
  - Added comprehensive validation in `batchUpsertProduct`: checks that all referenced instance IDs belong to the product and all existing instances are referenced
  - Improved error messages for validation failures with specific details about what failed
  - `UpdateIProductRequestDto.instances` is now optional - omitting it leaves existing instances unchanged

  ### Tests
  - Added `catalog-modifier.functions.spec.ts` with 11 tests for modifier type and option operations
  - Expanded `catalog-product.functions.spec.ts` to 48 tests including edge cases for modifier removal during product updates
  - Added tests for explicit instance updates with illegal modifier references

- 0d21b6e: ### Backend: Seating Update Support
  - Added seating change detection in `UpdateLockedOrderInfo` with move ticket printing when tables change for seated guests
  - New `SEATING_CHANGE` update ticket type for expo notifications
  - Move tickets include old and new table assignments

  ### wario-pos: Order Contents Editor
  - New `WOrderContentsEditor` component for editing order cart items after order creation
  - Added `useOrderEditorStore` for managing cart modifications with add/edit/delete operations
  - `ProductEditModal` for modifying individual product modifiers
  - `ProductSearchBar` with autocomplete for adding products to orders
  - Integrated `ProductModifierEditor` from shared package for consistent modifier UI

  ### wario-fe-order: Shared Customizer Migration
  - Migrated to shared `CustomerModifierCheckbox`, `CustomerModifierRadio`, `CustomerModifierToggle`, and `CustomerModifierTypeEditor` components from `@wcp/wario-ux-shared`
  - Removed local implementations: `WModifierOptionCheckboxComponent`, `WModifierRadioComponent`, `WModifierOptionToggle`, `WModifierTypeCustomizerComponent`, `WProductCustomizerLogic`
  - Simplified `WProductCustomizerComponent` to use shared `CustomizerProvider` context

  ### wario-shared: Modifier State Functions
  - New `modifier-state.ts` module with pure functions for modifier state manipulation
  - `updateRadioModifierSelection`: Handles single-select radio modifier changes
  - `updateCheckboxModifierSelection`: Handles multi-select checkbox modifier changes with placement support
  - Unit tests for `IsModifierTypeVisible` function

  ### wario-ux-shared: Product Customizer Module
  - New `product-customizer/` module with context, hooks, and components for product modification UI
  - `CustomizerProvider` and `useCustomizer` context for managing product customization state
  - `ProductModifierEditor`, `ModifierTypeEditor` components with card/inline layout variants
  - `CustomerModifierCheckbox`, `CustomerModifierRadio`, `CustomerModifierToggle` with size variants (`small`/`medium`)
  - New `EditableCartItem` component for displaying and editing cart items
  - New `PlacementIcons` (left/right/whole half-circle icons) for split modifier visualization
  - `useHasSelectableModifiers` hook moved to query module for better reusability

- fdeee52: add public REST enpoints for data normally synced via socketIO.
  consume the endpoints as a first sync attempt before socket data arrives

  We might want to revert this if we determine this isn't the best way to get data sooner or as part of graphQL migration. The goal in making the changes was to reduce the perceived "loading time" for things like the order page or menu.

- d1fc9af: ## Backend Architecture Refactor

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

- 8c35c75: - **wario-backend**: Added `RequestDebugLoggingInterceptor` for debug-level request logging and optimized calendar event updates.
  - **wario-pos**: Introduced Seating Timeline feature with `SeatingTimelineDialog` and `TimelineScrubber`.
  - **wario-fe-order**: Minor updates to `useOrderTotals` hook.

### Patch Changes

- 026f831: Fix Square external ID handling and category cycle detection
  - **Removed `ProductInstanceUpdateMergeExternalIds`**: This was previously clobbering existing Square IDs during batch product updates. External IDs are now preserved correctly.
  - **Added `ProductInstanceToSquareCatalogHelper`**: New helper that detects and repairs broken Square external IDs by deleting orphaned catalog entries before creating new ones.
  - **Fixed `CategoryIdHasCycleIfChildOfProposedCategoryId`**: Corrected the traversal logic to properly detect cycles when reassigning category parents.
  - **Refactored Mongoose repositories**: Introduced `toEntity` utility to consistently strip `_id` and `__v` fields.
  - **Added `isProduction` flag injection**: Order payment, printing, and store credit services now use injected config instead of environment variable.

- 0bbd895: - **@wcp/wario-pos**: Improved product editing workflow by consolidating product and instance updates into a single transaction. Added dirty state tracking for product instances to prevent data loss.
  - **@wcp/wario-backend**: Fixed regression in catalog sync where hidden product instances were incorrectly flagged for updates. Updated logic to strictly check for `MODIFIER_WHOLE` IDs.
  - **@wcp/wario-shared**: Relaxed validation on product instance descriptions.
  - **Global**: Updated lint and typecheck configuration to include E2E tests (`e2e` directory) in root scripts. Updated `e2e` configuration for compatibility.
- b00e8b2: Updated Seating Upsert DTOs to correctly support nested object creation in a single request. Adjusted `CreateSeatingLayoutRequestDto` and related DTOs to use `UpdateXxxItem` union types, matching the runtime validation behavior. Also includes dependency updates and documentation improvements.
- 1322f50: **Backend**: Updated order querying to support date range filtering via `findBy` method in repositories. Added E2E test configuration centralization.

  **POS**: Prevented unbounded orders query from overloading the browser. The `useOrdersQuery` hook now requires at least one constraint (date, endDate, or status) to be enabled, and `useOrderById` now uses the dedicated single-order API endpoint. Added date constraint to `usePendingOrdersQuery` for current date only.

  **Shared/UX-Shared**: Minor updates to support order query refactoring.

- f769530: Restructured backend directory for layered architecture:
  - **Phase 1**: Extracted order domain services from `config/` to `domain/order/` (OrderManagerService, OrderValidationService, etc.)
  - **Phase 2**: Consolidated database layer - moved Mongoose schemas to `infrastructure/database/mongoose/` and TypeORM entities to `infrastructure/database/typeorm/`
  - **Phase 3**: Moved infrastructure services - `socket-io/` to `infrastructure/messaging/` and `printer/` to `infrastructure/printing/`
  - **Runtime fixes**: Added missing seating Mongoose schemas (SeatingFloor, SeatingSection, SeatingPlacement, SeatingLayout, SeatingResource) and registered them in SettingsModule

- 1b1d4ca: # 2025 Schema Migration & Mongoose Updates
  - **Database Migration**: Implemented `MongooseToNewMigrator` to transition data to the 2025 schema structure. This is an additive "Phase 1" migration.
    - Inverts Category tree: Adds `children[]` and `products[]` to Categories; deprecates `parent_id` and `ordinal`.
    - Orders Options: Adds ordered `options[]` to OptionTypes; deprecates `ordinal` on Options.
    - Orders Product Instances: Adds ordered `instances[]` to Products; deprecates `baseProductId`.
    - Flattens Settings: Moves keys from `settings.config` to top-level fields.
  - **Boot Sequence**: `DatabaseManagerService` now executes this migration automatically for legacy Mongoose databases.
  - **Refactoring**: Updated catalog provider functions and controllers to support the new schema structure.

- 0ab3dbf: Added type-safe Auth0 scope constants and migrated all POS hooks to use them.

  **New Features:**
  - Added `AuthScopes` constants in `@wcp/wario-shared-private` for type-safe Auth0 scope handling
  - Created `useGetAuthToken` hook in wario-pos that wraps `getAccessTokenSilently` with proper error handling

  **Migrated Hooks:**
  - `useCategoryMutations`, `useConfigMutations`, `useConfigQueries`
  - `useFulfillmentMutations`, `useModifierOptionMutations`, `useModifierTypeMutations`
  - `useOrdersQuery`, `usePrinterGroupsQuery`, `useProductInstanceFunctionMutations`
  - `useProductInstanceMutations`, `useProductMutations`, `useSeatingLayoutQuery`
  - `useStoreCreditMutations`

  **Bug Fixes:**
  - `useCancelOrderMutation`: Now uses correct `cancel:order` scope (was `write:order`)
  - `useForceSendOrderMutation`: Now uses correct `send:order` scope (was `write:order`)
  - `useFulfillmentMutations`: Now uses correct `write:config`/`delete:config` scopes

  **Backend:**
  - Updated controllers to use `AuthScopes` constants in `@Scopes` decorators

- 913bc08: Added new `wario-bridge` edge server application for restaurant device communication (printers, KDS tablets, POS clients) and `wario-shared-private` internal package for bridge message types. Fixed ESLint warnings in Seating Layout Builder by adding explicit return types to hooks, memoizing dependencies, and adding eslint-disable comments for array index access checks.
- 52aca98: Added `SeatingModule` with full CRUD controllers and service for `SeatingFloor`, `SeatingLayout`, `SeatingPlacement`, `SeatingSection`, and `SeatingResource`.
- 5c94715: Refactored order querying to support date ranges and fixed calendar scrolling issues.
- Updated dependencies [026f831]
- Updated dependencies [0bbd895]
- Updated dependencies [b040a6d]
- Updated dependencies [0d21b6e]
- Updated dependencies [b00e8b2]
- Updated dependencies [1322f50]
- Updated dependencies [d1fc9af]
- Updated dependencies [f94c3b1]
- Updated dependencies [0ab3dbf]
- Updated dependencies [913bc08]
  - @wcp/wario-shared@2.1.0
  - @wcp/wario-shared-private@0.1.0

## 0.6.12

### Patch Changes

- Updated dependencies [9084066]
  - @wcp/wario-shared@2.0.1

## 0.6.11

### Patch Changes

- Updated dependencies [b4cbd1d]
- Updated dependencies [99895f1]
- Updated dependencies [aaa7803]
  - @wcp/wario-shared@2.0.0

## 0.6.10

### Patch Changes

- Updated dependencies [f7b0795]
  - @wcp/wario-shared@1.1.0
