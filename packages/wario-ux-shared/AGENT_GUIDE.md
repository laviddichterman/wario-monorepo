# Agent Guide - `wario-ux-shared`

## 1. Identity & Purpose

`wario-ux-shared` is methods/components shared primarily by **Internal/Admin** applications (like `wario-pos`).

- **Role**: Don't Repeat Yourself (DRY) for data access and common UI patterns.

## 2. Technical Architecture

- **React**: Components and Hooks.
- **TanStack Query**: Exports deeply integrated hooks like `useIsSocketDataLoaded`.
- **UI**: Material UI definitions.

### Key Exports

- `components/`: Loading screens, common dialogs.
- `query/`: **CRITICAL**. Contains the Logic for transforming raw API data into usable Selectors (e.g., `useCatalogSelectors`). This bridges the gap between `wario-shared` (raw types) and the UI.

## 3. Usage

- Used by: `wario-pos`, dev tools.
- **Not** typically used by `wario-fe-order` (which needs a lighter bundle), although some generic helpers might be shared.

## 4. Socket/Query Key Pattern

**CRITICAL**: When updating TanStack Query cache from socket events in `SocketContext.tsx`, the query keys **must match** the keys used in the query hooks.

All query hooks (e.g., `useFulfillmentsQuery`) use `[...QUERY_KEYS.xxx, hostAPI]` as their query key. Socket event handlers must use the same format:

```typescript
// ✅ Correct - includes hostAPI
socket.on(SOCKET_EVENTS.FULFILLMENTS, (data) => {
  queryClient.setQueryData([...QUERY_KEYS.fulfillments, hostAPI], Object.values(data));
});

// ❌ Wrong - missing hostAPI, cache update won't apply
socket.on(SOCKET_EVENTS.FULFILLMENTS, (data) => {
  queryClient.setQueryData(QUERY_KEYS.fulfillments, Object.values(data));
});
```

## 5. 2025 Schema Update Notes

The catalog data structure has been updated. See `src/query/IMPLEMENTATION_SUMMARY.md` for details.

**Key Changes**:

- Ordering is now embedded in parent entities (e.g., `IOptionType.options`, `ICategory.children/products`, `IProduct.instances`)
- Intermediate Entry types (`CatalogModifierEntry`, etc.) still exist in the codebase for backward compatibility, but new code should use the ordering arrays on parent types directly
- Use `IdOrdinalMap` for sorting instead of selector functions where possible

## 6. Testing

This package uses **Vitest** for unit testing.

```bash
pnpm test         # Run tests
pnpm test:watch   # Watch mode
```

- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Setup: `vitest.setup.ts` (jest-dom matchers)
- Utilities: Use `@wcp/wario-test-utils` for `renderWithProviders`, mock generators

See `/.agent/workflows/react-testing.md` for testing workflow guidance.

## 7. Performance Guidelines

### React & Hooks Stability

- **Stable Selectors**: When binding to stores (Zustand) or Queries, **ALWAYS** use stable selectors.
  - ❌ `useStore(s => ({ a: s.a, b: s.b }))` (Returns new object reference every render = re-render)
  - ✅ `useStore(useShallow(s => ({ a: s.a, b: s.b })))`
  - ✅ `useStore(s => s.a)` (Primitive values are stable)

- **Memoize Derived Data**: In Custom Hooks, especially those wrapping `TanStack Query`:
  - ❌ `return data.filter(...)` (Runs on every render)
  - ✅ `return useMemo(() => data.filter(...), [data])`
- **Avoid Expensive Computations in Selectors**: Select raw data and compute in the component/hook with `useMemo`. Selectors run on _every_ store update.
