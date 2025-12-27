# @wcp/wario-fe-order

## 1.1.0

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

### Patch Changes

- b00e8b2: Updated Seating Upsert DTOs to correctly support nested object creation in a single request. Adjusted `CreateSeatingLayoutRequestDto` and related DTOs to use `UpdateXxxItem` union types, matching the runtime validation behavior. Also includes dependency updates and documentation improvements.
- fdeee52: add public REST enpoints for data normally synced via socketIO.
  consume the endpoints as a first sync attempt before socket data arrives

  We might want to revert this if we determine this isn't the best way to get data sooner or as part of graphQL migration. The goal in making the changes was to reduce the perceived "loading time" for things like the order page or menu.

- 8c35c75: - **wario-backend**: Added `RequestDebugLoggingInterceptor` for debug-level request logging and optimized calendar event updates.
  - **wario-pos**: Introduced Seating Timeline feature with `SeatingTimelineDialog` and `TimelineScrubber`.
  - **wario-fe-order**: Minor updates to `useOrderTotals` hook.
- Updated dependencies [026f831]
- Updated dependencies [0bbd895]
- Updated dependencies [b040a6d]
- Updated dependencies [0d21b6e]
- Updated dependencies [b00e8b2]
- Updated dependencies [1322f50]
- Updated dependencies [fdeee52]
- Updated dependencies [d1fc9af]
- Updated dependencies [f94c3b1]
- Updated dependencies [913bc08]
  - @wcp/wario-shared@2.1.0
  - @wcp/wario-ux-shared@10.0.0
  - @wcp/wario-fe-ux-shared@7.0.0

## 1.0.1

### Patch Changes

- Updated dependencies [9084066]
  - @wcp/wario-shared@2.0.1
  - @wcp/wario-fe-ux-shared@6.0.1
  - @wcp/wario-ux-shared@9.0.1

## 1.0.0

### Major Changes

- 8968f41: use new wario-shared, first release with tanstack and friends.

  remove cartValidationListener in favor of CartValidationEffect component

  move some config to environment variables and add typing to vite-env.d.ts

### Patch Changes

- Updated dependencies [1f4cc37]
- Updated dependencies [b4cbd1d]
- Updated dependencies [99895f1]
- Updated dependencies [aaa7803]
- Updated dependencies [0fa67dc]
  - @wcp/wario-ux-shared@9.0.0
  - @wcp/wario-shared@2.0.0
  - @wcp/wario-fe-ux-shared@6.0.0

## 0.1.6

### Patch Changes

- Updated dependencies [d4e6577]
- Updated dependencies [f7b0795]
  - @wcp/wario-ux-shared@8.0.0
  - @wcp/wario-shared@1.1.0
  - @wcp/wario-fe-ux-shared@5.0.0

## 0.1.5

### Patch Changes

- Updated dependencies [e25448c]
- Updated dependencies [ba74408]
- Updated dependencies [2a53eb8]
- Updated dependencies [3120974]
- Updated dependencies [c2e0804]
  - @wcp/wario-shared@1.0.0
  - @wcp/wario-ux-shared@7.0.0
  - @wcp/wario-fe-ux-shared@4.0.0

## 0.1.4

### Patch Changes

- Updated dependencies [d51036d]
- Updated dependencies [ae61940]
  - @wcp/wario-ux-shared@6.0.1
  - @wcp/wario-shared@0.4.1
  - @wcp/wario-fe-ux-shared@3.0.1

## 0.1.3

### Patch Changes

- Updated dependencies [b84680e]
  - @wcp/wario-shared@0.4.0
  - @wcp/wario-fe-ux-shared@3.0.0
  - @wcp/wario-ux-shared@6.0.0

## 0.1.2

### Patch Changes

- Updated dependencies [387050c]
  - @wcp/wario-shared@0.3.1
  - @wcp/wario-fe-ux-shared@2.0.2
  - @wcp/wario-ux-shared@5.0.2

## 0.1.1

### Patch Changes

- Updated dependencies [61c16d0]
- Updated dependencies [b51abfc]
  - @wcp/wario-ux-shared@5.0.1
  - @wcp/wario-fe-ux-shared@2.0.1

## 0.1.0

### Minor Changes

- 506daad: - remove input components from wario-fe-order, use the ones in wario-ux-shared
  - additional linting fixes

### Patch Changes

- Updated dependencies [3b70a44]
- Updated dependencies [cb1c65d]
- Updated dependencies [7dcef5d]
- Updated dependencies [41e59f8]
  - @wcp/wario-ux-shared@5.0.0
  - @wcp/wario-shared@0.3.0
  - @wcp/wario-fe-ux-shared@2.0.0

## 0.0.5

### Patch Changes

- Updated dependencies [04b6b4e]
- Updated dependencies [39cc9ff]
- Updated dependencies [05b2fcb]
- Updated dependencies [1d70e2c]
- Updated dependencies [04b6b4e]
  - @wcp/wario-shared@0.2.1
  - @wcp/wario-ux-shared@4.0.1
  - @wcp/wario-fe-ux-shared@1.0.1

## 0.0.4

### Patch Changes

- Updated dependencies
  - @wcp/wario-fe-ux-shared@1.0.0
  - @wcp/wario-shared@0.2.0
  - @wcp/wario-ux-shared@4.0.0

## 0.0.3

### Patch Changes

- Updated dependencies
  - @wcp/wario-fe-ux-shared@0.1.1
  - @wcp/wario-shared@0.1.1
  - @wcp/wario-ux-shared@3.0.1

## 0.0.2

### Patch Changes

- Updated dependencies [331df09]
  - @wcp/wario-fe-ux-shared@0.1.0
  - @wcp/wario-shared@0.1.0
  - @wcp/wario-ux-shared@3.0.0
