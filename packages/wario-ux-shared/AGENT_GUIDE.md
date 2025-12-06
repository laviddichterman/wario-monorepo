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
