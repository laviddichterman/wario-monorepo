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

## 4. 2025 Schema Update Notes

The catalog data structure has been updated. See `src/query/IMPLEMENTATION_SUMMARY.md` for details.

**Key Changes**:

- Ordering is now embedded in parent entities (e.g., `IOptionType.options`, `ICategory.children/products`, `IProduct.instances`)
- Intermediate Entry types (`CatalogModifierEntry`, etc.) still exist in the codebase for backward compatibility, but new code should use the ordering arrays on parent types directly
- Use `IdOrdinalMap` for sorting instead of selector functions where possible
