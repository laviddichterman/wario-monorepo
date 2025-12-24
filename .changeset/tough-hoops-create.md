---
'@wcp/wario-pos': minor
---

- **Architecture**: Unified Order Drawer state management using `orderDrawerAtom` (Jotai), replacing local state and prop drilling in `OrderManager` and `OrderCalendar`.
- **New Feature**: Implemented `GlobalOrderDrawer` and `WOrderDrawerContent` for a consistent, enhanced order detail experience.
- **New Feature**: Added `OrderActionsBar`, `CancelOrderDialog`, and `ForceSendOrderDialog` for centralized order management actions.
- **Enhancement**: Updated `OrderCalendar` to support complex event titles (Customer Name + Cart Summary) and trigger the global drawer.
- **Refactor**: Relaxed type constraints on `ElementActionComponent` and `FulfillmentComponent` to support optional callbacks, fixing type assertions.
