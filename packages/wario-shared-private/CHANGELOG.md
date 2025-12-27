# @wcp/wario-shared-private

## 0.1.0

### Minor Changes

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
