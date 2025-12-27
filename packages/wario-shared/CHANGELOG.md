# @wcp/wario-shared

## 2.1.0

### Minor Changes

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

- b00e8b2: Updated Seating Upsert DTOs to correctly support nested object creation in a single request. Adjusted `CreateSeatingLayoutRequestDto` and related DTOs to use `UpdateXxxItem` union types, matching the runtime validation behavior. Also includes dependency updates and documentation improvements.
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

- 1322f50: **Backend**: Updated order querying to support date range filtering via `findBy` method in repositories. Added E2E test configuration centralization.

  **POS**: Prevented unbounded orders query from overloading the browser. The `useOrdersQuery` hook now requires at least one constraint (date, endDate, or status) to be enabled, and `useOrderById` now uses the dedicated single-order API endpoint. Added date constraint to `usePendingOrdersQuery` for current date only.

  **Shared/UX-Shared**: Minor updates to support order query refactoring.

- f94c3b1: Added seating layout entities and repositories to wario-backend.

  **New Entities:**
  - `SeatingFloorEntity` - Restaurant floors
  - `SeatingSectionEntity` - Sections within floors
  - `SeatingPlacementEntity` - Table positions on canvas
  - `SeatingLayoutEntity` - Layout aggregate
  - Updated `SeatingResourceEntity` to match `SeatingResourceDto`

  **Documentation:**
  - Added JSDoc comments to seating DTOs in wario-shared
  - Updated `DTO_GUIDE.md` with detailed field tables for all seating DTOs
  - Updated `AGENT_GUIDE.md` with new entity and repository listings

- 913bc08: Added new `wario-bridge` edge server application for restaurant device communication (printers, KDS tablets, POS clients) and `wario-shared-private` internal package for bridge message types. Fixed ESLint warnings in Seating Layout Builder by adding explicit return types to hooks, memoizing dependencies, and adding eslint-disable comments for array index access checks.

## 2.0.1

### Patch Changes

- 9084066: remove need for a root category ID

## 2.0.0

### Major Changes

- 99895f1: ## 2025 Schema Updates - Breaking Changes

  This release restructures how ordering is handled in the catalog, embedding ordering information directly in parent entities rather than using intermediate entry types.

  ### Removed DTOs
  - `CatalogModifierEntryDto` - Ordering now embedded in `IOptionTypeDto.options`
  - `CatalogCategoryEntryDto` - Ordering now embedded in `ICategoryDto.children` and `ICategoryDto.products`
  - `CatalogProductEntryDto` - Ordering now embedded in `IProductDto.instances`

  ### Removed Fields

  | Type               | Field                       | Replacement                                  |
  | ------------------ | --------------------------- | -------------------------------------------- |
  | `IProduct`         | `baseProductId`             | Use `instances[0]`                           |
  | `IProduct`         | `category_ids`              | Use `ICategory.products`                     |
  | `IProductInstance` | `ordinal`, `productId`      | Position in `IProduct.instances`             |
  | `ICategory`        | `ordinal`, `parent_id`      | Position in parent's `children`              |
  | `IOption`          | `ordinal`, `modifierTypeId` | Position/membership in `IOptionType.options` |
  | `IWSettings`       | `config`                    | Typed fields added directly                  |

  ### New Fields
  - `ICategory.children` - Ordered child category IDs
  - `ICategory.products` - Ordered product IDs in category
  - `IOptionType.options` - Ordered option IDs
  - `IProduct.instances` - Ordered product instance IDs (first = base)
  - `IProductOrderGuide.errors` - Error function IDs (not yet implemented)

  ### Changed Function Signatures
  - `GroupAndOrderCart` - Now takes `IdOrdinalMap` instead of category selector
  - `EventTitleStringBuilder` - Now takes `IdOrdinalMap` parameter
  - `IsOptionEnabled` - Now takes `modifierTypeId` as first parameter

  ### Removed Functions
  - `ComputeCategoryTreeIdList` - Redundant
  - `SortModifiersByOrdinal` - Redundant
  - `SortModifersAndOptions` - Redundant (options now pre-ordered in IOptionType.options)

  ### Migration Notes

  **Root Category Requirement**: A root category node must exist at the top of the category hierarchy. Database initialization on an empty install must create this root category (typically named "Root"). All other categories must be descendants of this root.

  Where possible, use `IdOrdinalMap` (a `Record<string, number>`) for ordering lookups instead of selector functions.

  See `packages/wario-shared/documentation/DTO_GUIDE.md` for complete documentation.

### Minor Changes

- b4cbd1d: The package provides multiple entry points to avoid bundling unnecessary dependencies:

  | Entry Point                 | Contents            | ESM Size                 | Use Case                                     |
  | --------------------------- | ------------------- | ------------------------ | -------------------------------------------- |
  | `@wcp/wario-shared`         | Everything          | 6KB + 238KB chunk        | Backend (needs DTOs with class-validator)    |
  | `@wcp/wario-shared/logic`   | Types + utilities   | **2.87KB** + 118KB chunk | Frontend (needs functions like `WDateUtils`) |
  | `@wcp/wario-shared/types`   | Interfaces + enums  | **561 bytes**            | Type-only imports                            |
  | `@wcp/wario-shared/testing` | Mock data factories | 48KB                     | Tests                                        |

  ### Choosing the Right Entry Point

  ```typescript
  // ✅ Type-only imports (smallest, no runtime code)
  import type { IProduct, ICategory } from '@wcp/wario-shared/types';
  import { FulfillmentType, DISABLE_REASON } from '@wcp/wario-shared/types';

  // ✅ Types + utility functions (no class-validator/class-transformer)
  import { WDateUtils, MoneyToDisplayString, WProductEquals } from '@wcp/wario-shared/logic';
  import type { ICatalogSelectors } from '@wcp/wario-shared/logic';

  // ✅ Backend DTOs with decorators (only in wario-backend)
  import { CreateOrderRequestV2Dto, UpdateIProductRequestDto } from '@wcp/wario-shared';
  ```

  > **Important**: Never import decorated DTO classes in frontend code. They pull in `class-validator` and `class-transformer` (~50KB+).

### Patch Changes

- aaa7803: Changes Breakdown
  Main Entry Point (index.ts)
  Before: Exported all modules directly
  After: Simplified to use barrel exports via new entry points

  -export _ from './lib/common';
  -export _ from './lib/derived-types';
  -export _ from './lib/dto/api.dto';
  -// ... 20+ lines
  +export _ from './lib/dto/index';
  +export _ from './logic.entry';
  +export _ from './types.entry';
  DTO Structure (api.dto.ts)
  Refactored option/option type DTOs for better clarity:

  New naming pattern:

  CreateIOptionRequestBodyDto - The option data (without id)
  CreateIOptionPropsDto - The full request (includes modifierTypeId + option)
  UpdateIOptionPropsDto - Update variant (includes id + modifierTypeId + option)
  Same pattern for option types:

  CreateIOptionTypeRequestBodyDto - Modifier type data (without id, includes nested options[])
  UpdateIOptionTypeRequestBodyDto - Partial update of modifier type
  UpdateIOptionTypePropsDto - Full update props (includes id + modifierType)
  Catalog Type Migration
  Before: ICatalog defined as DTO in catalog.dto.ts
  After: ICatalog is now a runtime type in types.ts

  This is architecturally correct because:

  ICatalog is never sent over the wire as-is (it's a compiled/derived structure)
  DTOs should only contain data that crosses API boundaries
  Runtime types belong in types.ts per the package conventions
  Test Improvements
  tests/mocks.ts
  :

  // Default Square external IDs so tests properly trigger BatchRetrieveCatalogObjects
  externalIDs: [
  { key: 'SQID_ITEM', value: 'FAKE_SQID_ITEM' },
  { key: 'SQID_ITEM_VARIATION', value: 'FAKE_SQID_ITEM_VARIATION' },
  ],
  This ensures mock product instances have Square IDs by default, making tests more realistic.

## 1.1.0

### Minor Changes

- f7b0795: fix descriminated type creation and derivation

## 1.0.0

### Major Changes

- e25448c: switch to class based types and derive from those to maintain parity.
  since class-validator and class-transformer use the Dto suffix, we've renamed the following types to avoid confusion between the base types and the Dto pattern
  - all instances of FulfillmentDto should be renamed to FulfillmentData
  - all instances of CustomerInfoDto should be renamed to CustomerInfoData
  - all instances of FulfillmentDto should be renamed to FulfillmentData
- 2a53eb8: move enums to their own file
  rename types ending in Dto to something else to avoid future refactor changes
  add support for decorators for future refactor

## 0.4.1

### Patch Changes

- ae61940: Add CJS exports to wario-shared

## 0.4.0

### Minor Changes

- b84680e: remove grouping comma for numbers, be more permissive with parseInteger

## 0.3.1

### Patch Changes

- 387050c: add some helper types and improve PurchaseStoreCreditRequest

## 0.3.0

### Minor Changes

- 7dcef5d: - wario-shared: updates to numbers helper functions to allow for non-fixed precision decimal numbers
  - wario-ux-shared: move all input components into a subdirectory
  - wario-ux-shared: implement CheckedNumericTextInput with wario-shared number functions
  - wario-ux-shared: implement RHFTextField with wario-shared number functions
- 41e59f8: Move number parsing and formatting to wario-shared
  Move RoundToTwoDecimalPlaces to the numbers method
  Add tests for numbers methods

## 0.2.1

### Patch Changes

- 04b6b4e: add linting fixes
- 05b2fcb: move SortProductModifierEntries, SortProductModifierOptions, SortAndFilterModifierOptions, FilterUnselectableModifierOption into wario-shared

## 0.2.0

### Minor Changes

- first version that compiles across most of the stack

## 0.1.2

### Patch Changes

- try again

## 0.1.1

### Patch Changes

- initial publish using monorepo

## 0.1.0

### Minor Changes

- 331df09: initial publish
