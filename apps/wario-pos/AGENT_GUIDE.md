# Agent Guide - `wario-pos`

## 1. Identity & Purpose

`wario-pos` is the **staff-facing Point of Sale interface**. It is a heavy, data-rich Single Page Application (SPA) designed for:

- **High Velocity**: Order entry must be fast.
- **Reliability**: Must handle spotty connections (though primarily online) and complex data states.
- **Kitchen Management**: Viewing orders, moving tickets, printing.
- **Catalog Management**: Modifying products, prices, and availability on the fly.

## 2. Technical Architecture

### Core Framework

- **React 19**: Using latest features.
- **Vite**: Build tool for fast HMR.
- **Routing**: `react-router` v7. Routes defined in `src/routes/sections`.
- **Styles**: Material UI (MUI) + Emotion. **Strict Rule**: Use `styled()` components or the `sx` prop. Do not use CSS modules.

### Directory Structure (`src/`)

- `routes/`: Routing configuration. `sections/index.tsx` is the router root.
- `pages/`: Lazy-loaded page components (Minimal logic, just composition).
- `sections/`: **Feature Vertical Slices**.
  - `sections/order/`: All logic for Order Lists, Details, Kanban.
  - `sections/catalog/`: Logic for Product/Category management.
- `atoms/`: **Jotai State Definitions**. The "Glue" of the app.
- `auth/`: Auth0 wrapper and Guards (`AuthGuard`).
- `hooks/`: Custom hooks, heavily focused on Data Fetching (wrapping Query).

### State Management Strategy (The "Trinity")

#### 1. Server State (TanStack Query)

**Primary Source of Truth**.

- **Pattern**: Custom hooks wrapping `useQuery`.
- **Example**: `useOrdersQuery.ts`.
- **Key behaviors**:
  - **Polling**: Auto-refetches every 30s (`refetchInterval`).
  - **Idempotency**: Mutations (like `useConfirmOrderMutation`) **MUST** send an `Idempotency-Key` header with a UUID.

#### 2. Local Shared State (Jotai)

**UI State & Inter-component communication**.

- **Pattern**: "Action Atoms".
- **Example**: `src/atoms/catalog.ts`.
- **Usage**: Instead of passing `setIsDialogOpen` down 10 levels, components subscribe to `dialogueStateAtom` and call `openCategoryEditAtom` to trigger actions.

#### 3. Global App State (Context/Zustand)

**Session & Singletons**.

- **Usage**: Auth state, Theme settings. Less frequent modifications.

## 3. Critical Workflows

### The Catalog Editor

Located in `src/sections/catalog`. This is a complex UI that writes back to `wario-backend`.

- **Flow**: User clicks "Edit" -> `openProductEditAtom` fires -> `CatalogDialog` opens.
- **Saving**: `ProductEditContainer` handles complex saves:
  - Updates Product Class via `useEditProductMutation`.
  - Concurrently updates/creates Product Instances via `useUpdateProductInstanceMutation`/`useCreateProductInstanceMutation`.
- **Post-Save**: Invalidate Query -> UI updates.

### Order Dashboard

Located in `src/sections/order`.

- **Real-time**: Leverages `useSocketData` (from `wario-ux-shared`) to listen for 'order:created' events, triggering a query refetch.

## 4. Developer Guide

### Running Locally

```bash
# Start Vite dev server from root of the monorepo
pnpm run pos:dev
```

### Common Tasks

- **Adding a New Route**:
  1.  Create page in `src/pages/dashboard/my-feature.tsx`.
  2.  Add to `src/routes/sections/dashboard.tsx` inside `dashboardRoutes`.
- **Adding a New Dialog**:
  1.  Define new Type in `CatalogDialog` union in `src/atoms/catalog.ts`.
  2.  Create "Open" action atom.
  3.  Add component to the Dialog renderer (likely in `CatalogView`).

## 5. Gotchas & Warnings

- > [!IMPORTANT]
  > **Idempotency Keys**: If you write a mutation that changes business data (Orders, Payments), you **must** generate a UUID and send it as `Idempotency-Key`. The backend will reject duplicate requests without it.
- > [!TIP]
  > **Performance**: This app renders _a lot_ of DOM elements (huge data grids). Use `useMemo` for derived data (like `useGroupedAndSortedCart`) to avoid jank.
