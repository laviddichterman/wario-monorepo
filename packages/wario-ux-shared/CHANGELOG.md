# @wcp/wario-ux-shared

## 10.0.0

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

- fdeee52: add public REST enpoints for data normally synced via socketIO.
  consume the endpoints as a first sync attempt before socket data arrives

  We might want to revert this if we determine this isn't the best way to get data sooner or as part of graphQL migration. The goal in making the changes was to reduce the perceived "loading time" for things like the order page or menu.

### Patch Changes

- 1322f50: **Backend**: Updated order querying to support date range filtering via `findBy` method in repositories. Added E2E test configuration centralization.

  **POS**: Prevented unbounded orders query from overloading the browser. The `useOrdersQuery` hook now requires at least one constraint (date, endDate, or status) to be enabled, and `useOrderById` now uses the dedicated single-order API endpoint. Added date constraint to `usePendingOrdersQuery` for current date only.

  **Shared/UX-Shared**: Minor updates to support order query refactoring.

- Updated dependencies [026f831]
- Updated dependencies [0bbd895]
- Updated dependencies [b040a6d]
- Updated dependencies [0d21b6e]
- Updated dependencies [b00e8b2]
- Updated dependencies [1322f50]
- Updated dependencies [d1fc9af]
- Updated dependencies [f94c3b1]
- Updated dependencies [913bc08]
  - @wcp/wario-shared@2.1.0

## 9.0.1

### Patch Changes

- Updated dependencies [9084066]
  - @wcp/wario-shared@2.0.1

## 9.0.0

### Minor Changes

- 1f4cc37: consume new wario-shared. add category-shopper

### Patch Changes

- 0fa67dc: consume tree shaken wario-shared lib
- Updated dependencies [b4cbd1d]
- Updated dependencies [99895f1]
- Updated dependencies [aaa7803]
  - @wcp/wario-shared@2.0.0

## 8.0.0

### Patch Changes

- d4e6577: improve OOTB catalog hooks and ensure they allow null strings since that's the same as an empty string for better error checking
- Updated dependencies [f7b0795]
  - @wcp/wario-shared@1.1.0

## 7.0.0

### Patch Changes

- ba74408: - use SxSpreadUtils in wario-ux-shared to handle typescript issues with spreading props
  - MoneyInput has predefined formatFunction and parseFunction
- 3120974: Add spreadSx utils to wario-ux-shared
- c2e0804: - implement proper "All" button filter with mui-data-grid
- Updated dependencies [e25448c]
- Updated dependencies [2a53eb8]
  - @wcp/wario-shared@1.0.0

## 6.0.1

### Patch Changes

- d51036d: -fix RHFTextField's onBlur handler
  -first working version of wario-fe-credit
- Updated dependencies [ae61940]
  - @wcp/wario-shared@0.4.1

## 6.0.0

### Patch Changes

- Updated dependencies [b84680e]
  - @wcp/wario-shared@0.4.0

## 5.0.2

### Patch Changes

- Updated dependencies [387050c]
  - @wcp/wario-shared@0.3.1

## 5.0.1

### Patch Changes

- 61c16d0: add ValSetVal and other reactjs helpers to wario-ux-shared
- b51abfc: remove debug output on RHFCheckbox

## 5.0.0

### Minor Changes

- cb1c65d: bring input forms into wario-ux-shared, update all other package deps
- 7dcef5d: - wario-shared: updates to numbers helper functions to allow for non-fixed precision decimal numbers
  - wario-ux-shared: move all input components into a subdirectory
  - wario-ux-shared: implement CheckedNumericTextInput with wario-shared number functions
  - wario-ux-shared: implement RHFTextField with wario-shared number functions

### Patch Changes

- 3b70a44: small change to CheckedNumericInput to clarify the onChange function will not need to accept an empty string value if allowEmpty=false
- Updated dependencies [7dcef5d]
- Updated dependencies [41e59f8]
  - @wcp/wario-shared@0.3.0

## 4.0.1

### Patch Changes

- 39cc9ff: linting fixes for wario-ux-shared
- 1d70e2c: improve types in thunks
- Updated dependencies [04b6b4e]
- Updated dependencies [05b2fcb]
  - @wcp/wario-shared@0.2.1

## 4.0.0

### Minor Changes

- first version that compiles across most of the stack

### Patch Changes

- Updated dependencies
  - @wcp/wario-shared@0.2.0

## 3.0.2

### Patch Changes

- try again
- Updated dependencies
  - @wcp/wario-shared@0.1.2

## 3.0.1

### Patch Changes

- initial publish using monorepo
- Updated dependencies
  - @wcp/wario-shared@0.1.1

## 3.0.0

### Minor Changes

- 331df09: initial publish

### Patch Changes

- Updated dependencies [331df09]
  - @wcp/wario-shared@0.1.0
