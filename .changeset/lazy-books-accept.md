---
'@wcp/wario-pos': minor
---

Add navigation guard and improve naming UX for Seating Layout Builder

**Navigation Guard:**

- Added reusable `useNavigationGuard` hook wrapping react-router's `useBlocker` to intercept navigation when there are unsaved changes
- Added `NavigationGuardDialog` component with Discard/Stay/Save options
- Integrated into `SeatingBuilderView` to prompt before leaving with unsaved layout changes
- Also blocks browser back/forward/close via `beforeunload` event

**Naming UX Improvements:**

- Generalized `RenamePopover` → `NamePopover` to handle both add and rename operations
- Replaced modal dialogs for adding layouts/floors/sections with compact inline popovers
- Consistent anchoring: popovers anchor to the dropdown selector or trigger button
- Added table copy functionality with "Copy Selected" button in toolbar

**Other Changes:**

- Renamed `FloorTabs` → `FloorSelector` for consistency
- Updated table placement logic to prevent overlap across sections on the same floor
