---
'@wcp/wario-backend': patch
'@wcp/wario-pos': patch
'@wcp/wario-shared': patch
'@wcp/wario-ux-shared': patch
---

**Backend**: Updated order querying to support date range filtering via `findBy` method in repositories. Added E2E test configuration centralization.

**POS**: Prevented unbounded orders query from overloading the browser. The `useOrdersQuery` hook now requires at least one constraint (date, endDate, or status) to be enabled, and `useOrderById` now uses the dedicated single-order API endpoint. Added date constraint to `usePendingOrdersQuery` for current date only.

**Shared/UX-Shared**: Minor updates to support order query refactoring.
