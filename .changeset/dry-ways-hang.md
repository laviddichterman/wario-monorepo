---
'@wcp/wario-backend': minor
'@wcp/wario-pos': minor
'@wcp/wario-fe-order': minor
'@wcp/wario-shared': minor
'@wcp/wario-ux-shared': minor
---

### Backend: Seating Update Support

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
