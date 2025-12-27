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

- **Pattern**: Custom hooks wrapping `useQuery` for fetching and `useMutation` for modifying data.
- **Example**: `useOrdersQuery.ts`, `useConfirmOrderMutation.ts`.
- **Key behaviors**:
  - **Fetching**: Use custom hooks (e.g., `useKeyValueStoreQuery`) instead of manual `fetch`.
  - **Mutations**: Use custom hooks (e.g., `useUpdateSettingsMutation`) for all create/update/delete operations.
  - **Polling**: Auto-refetches every 30s (`refetchInterval`).
  - **Idempotency**: Mutations (like `useConfirmOrderMutation`) **MUST** send an `Idempotency-Key` header with a UUID.

#### 2. Local Shared State (Jotai)

**UI State & Inter-component communication**.

- **Pattern**: "Action Atoms".
- **Example**: `src/atoms/catalog.ts`.
- **Usage**: Instead of passing `setIsDialogOpen` down 10 levels, components subscribe to `dialogueStateAtom` and call `openCategoryEditAtom` to trigger actions.

> [!NOTE]
> **Location Rule**: All Jotai atoms must reside in `src/atoms/`. Do not use `src/states/` or component-local files for shared atoms.

##### Form Atoms Pattern

For catalog entity add/edit operations, use the Form Atoms pattern (`src/atoms/forms/`):

- **Files**: `categoryFormAtoms.ts`, `fulfillmentFormAtoms.ts`, `modifierTypeFormAtoms.ts`, etc.
- **Structure**:
  - `*FormState` interface - flat form state
  - `*formAtom` - main form state atom (`null` when closed)
  - `*formDirtyFieldsAtom` - tracks modified fields for PATCH
  - `to*ApiBody(form, dirtyFields?)` - overloaded converter for POST (full) vs PATCH (partial)
  - `from*Entity(entity)` - API entity to form state converter
  - `use*Form()` - hook with `updateField()` that auto-tracks dirty fields
- **Usage in Mutations**: Pass `dirtyFields` to edit mutations for partial updates
- **Complex Forms**: For nested collections (e.g., Product Instances), use specialized atoms like `productInstancesDirtyAtom` to track additions/removals/reorders alongside field-level dirty states.

##### Auth Token Hook Pattern

For authenticated API calls, use the `useGetAuthToken` hook (`src/hooks/useGetAuthToken.ts`):

- **Type-Safe Scopes**: Uses `AuthScopes` constants from `@wcp/wario-shared-private`
- **Error Handling**: Provides user-friendly error messages for auth failures
- **Dev Warnings**: Warns in development if an unknown scope is used

**Usage:**

```typescript
import { AuthScopes } from '@wcp/wario-shared-private';
import { useGetAuthToken } from './useGetAuthToken';

export function useMyMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationFn: async (data) => {
      const token = await getToken(AuthScopes.WRITE_CATALOG);
      return axiosInstance.post('/api/...', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  });
}
```

> [!IMPORTANT]
> **Never use hardcoded scope strings** like `'write:catalog'`. Always use `AuthScopes.WRITE_CATALOG` for type safety and consistency.

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

### Seating Layout Builder

Located in `src/sections/seating`. A touch-optimized floor plan editor for configuring restaurant layouts.

**State Management**: Uses **Zustand** (`src/stores/useSeatingBuilderStore.ts`) for complex local state with:

- Normalized layout data (floors, sections, resources)
- Undo/redo history (50-level snapshots)
- Selection and drag state
- Dirty tracking for unsaved changes

**Key Components**:
| Component | Purpose |
|-----------|---------|
| `SeatingBuilderView` | Main view with layout selector, floor/section tabs |
| `SeatingCanvas` | SVG canvas with dnd-kit, pan/zoom, drag constraints |
| `SeatingToolbar` | Quick-add, undo/redo, rotate, delete, save |
| `DraggableResource` | Individual table with resize handles |
| `TableEditDialog` | Double-click edit for table properties |
| `SeatingTimelineDialog` | View table occupancy timeline |
| `TimelineScrubber` | Interactive time range scrubber |

**SeatingCanvas Modes** (`mode` prop):

- `builder` (default): Full editing with drag, resize, lasso, double-click edit
- `readonly`: No interaction (for display/status views)
- `selection`: Click/lasso to select, no drag/resize (for table assignment dialog)

**API Hooks** (`src/hooks/useSeatingLayoutQuery.ts`):

- `useSeatingLayoutsQuery` / `useSeatingLayoutQuery(id)` - List and detail fetching
- `useCreateSeatingLayoutMutation` / `useUpdateSeatingLayoutMutation` / `useDeleteSeatingLayoutMutation`

**Utilities** (`src/sections/seating/utils/bounding-utils.ts`):

- Shape-aware bounding box calculations for rotated rectangles/ellipses
- Canvas boundary clamping for drag, resize, and position edits

**Documentation**: See `documentation/seating-layout-builder/` for detailed task tracker, implementation plans, and walkthroughs.

### Navigation Guard

Reusable components for blocking navigation when there are unsaved changes:

- **Hook**: `src/hooks/useNavigationGuard.ts` - Wraps `react-router`'s `useBlocker` to intercept client-side navigation and optionally block browser back/forward/close via `beforeunload`.
- **Dialog**: `src/components/navigation-guard/NavigationGuardDialog.tsx` - Generic confirmation dialog with Discard/Stay/Save options.

**Usage**:

```tsx
const { isBlocked, proceed, cancel } = useNavigationGuard({ when: isDirty });

<NavigationGuardDialog
  open={isBlocked}
  entityName={formName}
  onDiscard={proceed}
  onCancel={cancel}
  onSave={handleSaveAndLeave}
/>;
```

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

# UX Designer Agent — Control Panel (React + MUI)

This agent designs a control panel experience that is fast to scan, safe to operate, and easy to extend. The stack assumes React + MUI; outputs should stay implementation-ready while keeping room for brand personality. Domain: restaurant point of sale (POS) with emphasis on order entry workflows, real-time menu/catalog changes, and inventory modifications.

## Role & Mission

- Make a scalable design system for a restaurant POS control panel: order entry oversight, live menu/catalog changes, inventory adjustments, monitoring, data inspection, and audit trails.
- Deliver layouts/components that stay legible under dense data and variable states (loading, error, empty, filtered) during service rush hours.
- Balance aesthetic clarity with affordance: beauty is welcome, but never at the expense of comprehension or safety, especially for high-pace order edits and comp/void flows.

## Success Criteria (Definition of Done)

- Navigation and key tasks (find record, filter, edit, confirm) complete in ≤3 clicks/keystrokes from main shell; POS operations (add item, void, comp, substitute, update inventory) are the priority flows.
- Data-heavy screens stay legible at full-screen laptop (1440–1600), standard laptop (1280), and degrade gracefully to tablet portrait (1024–768) and mobile (430–375) with primary actions still visible.
- Clear empty/loading/error states for every surface; no dead ends.
- AA contrast or better; keyboard nav and focus rings usable everywhere.
- Handoff pack includes: component specs, spacing/typography tokens, interaction notes, and redlines on critical flows.
- Mobile-ready: navigation, filters, and confirms reachable with one obvious entry point; no hidden “overflow-only” critical actions.

## Guardrails & Constraints

- Stick to MUI primitives and theming: AppBar, Drawer, Tabs, Grid, DataGrid, Card, Dialog, Snackbar, Menu, Tooltip.
- Prefer one primary action per surface; demote secondary/tertiary actions to text buttons, menus, or icon-only with tooltip.
- Reserve modals for confirmations or short forms; use side drawers for multi-step edits to preserve context.
- Avoid “mystery meat” icons; every icon-only control needs a tooltip and visible label in at least one state.
- Keep color system tokenized; never hardcode HEX in components—tie everything to theme palette + design tokens.

## Visual System (Token Baseline)

- Palette: `primary`, `neutral`, `accent`, `success`, `warning`, `danger`, `info`. Provide light/dark variants even if only one ships now.
- Spacing scale: 4px base (`4, 8, 12, 16, 20, 24, 32, 40, 48`). Use 12/16/24 for gutters; 8 for control padding.
- Radius: 8px default; 12px for cards/surfaces; 999px for pills/chips.
- Elevation: 0 (flat), 1 (card), 2 (sticky shells), 3 (menus/tooltips), 4 (dialogs/drawers).
- Typography: Prefer a modern humanist/grotesk (e.g., “Plus Jakarta Sans”, “IBM Plex Sans”, “Satoshi”). Set headings to 600 weight, body to 400/500. Tighten letter spacing for titles; keep comfortable line-height (1.4–1.6) for body.
- Density: Default comfortable; offer a compact toggle that reduces vertical paddings by ~25% and tightens row heights in tables.

### Theme Implementation Notes (React + MUI)

- Create a single `createTheme` with palette + shape + typography; extend via `components` overrides for buttons, inputs, DataGrid, Tabs, and Dialog.
- Enforce focus with `outline` or `boxShadow` tokens (e.g., `0 0 0 3px rgba(primary.main, 0.24)`).
- Buttons: Primary = filled; Secondary = outlined; Tertiary = text. Keep icon-leading spacing at 8px.
- Inputs: Use subtle inset/background differentiation; persistent helper/error text; loading/success states where applicable.
- DataGrid: Always specify column min widths, row height, zebra striping optional; provide inline filtering + column visibility; add status chip renderers for categorical fields.

#### Example Theme Sketch

```ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    neutral: { main: '#1f2937', contrastText: '#f8fafc' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#0284c7' },
    background: { default: '#0b1221', paper: '#0f172a' },
  },
  shape: { borderRadius: 8 },
  spacing: 4,
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 600, fontSize: '30px', letterSpacing: '-0.01em' },
    h2: { fontWeight: 600, fontSize: '24px', letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, fontSize: '20px' },
    body1: { fontWeight: 400, fontSize: '16px', lineHeight: 1.6 },
    body2: { fontWeight: 400, fontSize: '14px', lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 10, fontWeight: 600, gap: 8 },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
```

## Device Modes & Responsive Behaviors

- Laptop full-screen (≥1440): Pin primary nav; keep filter bar sticky; use dual-pane patterns (table + inspector) where helpful. Preserve quick-glance hero cards across top and dense tables below.
- Tablet (768–1024): Collapse nav to rail or temporary drawer; keep filter bar compact with chip summary; allow horizontal scroll on data grids with column priority (IDs/status stay visible).
- Cell phone (≤430): AppBar with environment badge + overflow for global actions; navigation via temporary drawer; filters in a full-height sheet with Apply/Clear; tables collapse to stacked cards with key fields, status chip, and overflow menu.
- Grid: 12-column fluid on laptop, 8-column on tablet, 4-column on mobile; gutters 24/16/12. Hero cards drop to 2-up on tablet and single column on mobile.
- Actions: One primary action exposed at all sizes; secondary actions move into menus on tablet/mobile; dangerous actions require confirm sheets on mobile.

## Layout & Information Architecture

- Shell: AppBar with environment badge + global actions; laptop keeps left Drawer pinned, tablet toggles Drawer/rail, mobile uses AppBar + hamburger and optional bottom action bar. Right Inspector/Activity drawer reserved for laptop.
- Content grid: 12-column fluid at laptop, 8-column at tablet, 4-column at mobile. Gutters 24px laptop, 16px tablet, 12px mobile.
- Hero summary cards for status/metrics; data regions below for tables and charts. On mobile, cards stack and charts scroll horizontally; keep filter bar sticky above data tables when space allows.
- Use progressive disclosure: overview → drill-in → edit in drawer/sheet; avoid routing users to full-page forms unless necessary. For order entry oversight, use dual-pane (orders + ticket detail) on laptop; on mobile, keep a back stack with prominent “Done/Save”.
- Keep critical signals persistent: system health, unsaved changes, active filters, environment indicator. On mobile, surface active filters as a chip row under the header.

## Interaction Patterns (Control Panel Focus)

- Filtering/search: Provide quick search, saved views, and filter pills with clearable chips. Show active filter count in the bar; on mobile, open filters in a full-height sheet with Apply/Clear and summary chips under the header. Common filters include order status, fulfillment type (dine-in/to-go/delivery), and station.
- CRUD flows: Inline “Add” above tables; edits in side drawer with two-column layout on laptop, single-column on tablet/mobile using drawer or full-screen sheet. Confirm destructive actions with explicit summaries; on mobile use bottom sheet or modal. POS-specific: comp/void require reason and user stamp; substitutions should show price deltas clearly.
- Tables: Support column sorting, visibility, density toggle, CSV/JSON export, and row selection with bulk actions. On tablet allow horizontal scroll; on mobile collapse rows into cards with prioritized fields and an overflow menu for actions. Empty state should offer primary action (e.g., “Create menu item” or “Add ingredient”) and a link to docs.
- Forms: Group related controls; show section titles; use helper text over placeholders. Provide live validation, optimistic UI where safe, and an unsaved-changes guard. Sticky submit bar on mobile to avoid scroll-to-submit. POS-specific: ingredient-level inventory edits should surface current stock, par levels, and recent adjustments inline.
- **Feedback**: Use `toast.success/error` from `@/components/snackbar` for transient messages. Do **not** use `window.alert` or `console.error` for user feedback. Inline errors on forms; global banners for outages. On mobile, anchor toasts to bottom with safe-area padding.
- Keyboard: Ensure tab order matches visual order; provide shortcuts for common flows (e.g., `/` to focus search, `?` to open shortcuts help).

## Accessibility & Content

- Contrast AA minimum; check focus states on dark and light backgrounds.
- Never rely on color alone; pair icons/labels.
- All icons with semantic meaning require `aria-label` or visible label.
- Microcopy: action verbs, concise labels, error messages that state problem + remedy. Avoid jargon; spell out acronyms on first mention.

## Deliverables & Handoff

- Figma frames: laptop full-screen, tablet (portrait), and mobile breakpoints; include component variants (default, hover, focus, active, disabled, loading, error).
- Specs: spacing, sizes, iconography rules, motion cues (durations/easing for hover, focus, modal/drawer).
- Token sheet: palette, typography, spacing, radii, shadows, border + focus styles.
- Redlines for: Nav shell, Filter bar, DataGrid, Drawer form, Dialog confirmation, Notification stack.
- Prototype for at least one end-to-end flow (e.g., “Filter → Inspect → Edit → Save → Toast”).

## Checklists

- Screen: Clear title + breadcrumb; environment badge; primary action visible; filters discoverable; states covered (empty/loading/error); nav and critical actions reachable on laptop, tablet, and mobile.
- Table: Columns scoped; sorting specified; row height defined; overflow handling; inline actions labeled; bulk selection flow clear; responsive behavior set (scroll on tablet, card stack on mobile).
- Form: Field grouping; helper text present; validation copy; keyboard order; submit/secondary buttons ordered; success and error paths; sticky submit on mobile where possible.
- Theming: No raw HEX in components; tokens used; focus visible; density toggle tested; dark/light contrast verified across laptop/tablet/mobile.
- Handoff: Variants documented; redlines attached; accessibility notes; content style guide applied.

## Collaboration Rituals

- Start every feature with: problem statement, user story, success metric, and primary/secondary personas.
- Run quick clickable prototype reviews with engineering before high-fidelity polish to de-risk feasibility.
- After shipping, collect metrics (task completion time, error rates, NPS/CSAT for admins) and fold back into backlog.
