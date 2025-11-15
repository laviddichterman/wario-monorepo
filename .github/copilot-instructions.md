# Wario Monorepo - AI Coding Agent Instructions

## Architecture Overview

This is a **pnpm monorepo** for a restaurant Point of Sale (POS) and ordering system with multiple frontend apps and a NestJS backend, all sharing common packages.

### Repository Structure

```
apps/
  wario-pos/           # Point-of-sale admin SPA (Auth0, port 3003)
  wario-fe-menu/       # Public menu display SPA (port 3002)
  wario-fe-order/      # Customer ordering flow SPA (port 3000)
  wario-fe-credit/     # Store credit management SPA
  wario-fe-faq/        # FAQ SPA
  wario-backend/       # NestJS server with TypeORM, GraphQL, Socket.io (port 4001)
packages/
  wario-shared/        # Pure TS business logic & types (published to npm)
  wario-ux-shared/     # React components + Redux slices (used by pos, menu, order)
  wario-fe-ux-shared/  # Frontend-specific UI components (used by menu, order, faq, credit)
```

**Critical**: All apps depend on workspace packages using `workspace:*` protocol. Changes to shared packages require rebuilding consuming apps.

**Package Usage**:
- `wario-shared`: Used by ALL packages and apps for shared types and business logic
- `wario-ux-shared`: Used by `wario-pos`, `wario-fe-menu`, `wario-fe-order`
- `wario-fe-ux-shared`: Used by `wario-fe-menu`, `wario-fe-order`, `wario-fe-faq`, `wario-fe-credit`

## Technology Stack

- **Frontend**: React 19, Vite 7.1, TypeScript 5.9, MUI 7, Redux Toolkit, socket.io-client
- **Backend**: NestJS 11, TypeORM, PostgreSQL, GraphQL subscriptions, Socket.io
- **Build**: pnpm 10.x workspaces, tsup (packages), Vite (apps)
- **State**: Redux with normalized EntityState via `@reduxjs/toolkit`
- **Auth**: Auth0 (between wario-pos and wario-backend)
- **Testing**: Jest 30 with ts-jest (backend + wario-shared only)
- **Package Manager**: pnpm 10.x (NOT npm)

## Development Workflows

### Starting Applications

```bash
# From monorepo root - use pnpm filter commands
pnpm --filter @wcp/wario-pos dev          # Start POS app
pnpm --filter @wcp/wario-fe-menu dev      # Start menu app
pnpm --filter @wcp/wario-backend start:debug  # Start backend with debugging

# Or use package.json aliases
pnpm pos:dev
pnpm menu:dev
pnpm backend:start

# VS Code tasks available:
# - "dev:all (pos+backend)" runs both in parallel
# - Individual dev:pos, dev:menu, dev:backend:debug tasks
```

**Port assignments**: menu=3002, order=3000, pos=3003, backend=4001 (from .env files)

### Building & Linting

```bash
pnpm build              # Build all apps and packages recursively
pnpm pkgs:build         # Build packages only
pnpm lint              # Lint all workspaces
pnpm typecheck         # Type-check all workspaces
pnpm checkall          # build + lint + typecheck
```

**Important**: Always rebuild shared packages after changes before testing dependent apps.

### Testing

Jest is configured **only** for `wario-shared` package and `wario-backend` app:

```bash
# wario-shared uses Jest with custom config
cd packages/wario-shared
pnpm test

# wario-backend has inline Jest config in package.json
cd apps/wario-backend
pnpm test
```

Frontend apps do **not** have test suites currently.

## Backend Architecture

### NestJS Backend (`wario-backend`)

**Stack**: NestJS 11 + TypeORM + PostgreSQL + GraphQL + Socket.io

**Current State**: Minimal implementation - only basic controller/service scaffolding exists.

**Planned Architecture**:
- **TypeORM**: Database ORM for PostgreSQL
- **GraphQL Subscriptions**: Real-time API for POS system
- **Socket.io**: Real-time communication for order updates
- **Auth0**: Authentication for POS admin access

**Types**: Backend uses types from `wario-shared` package for API contracts, ensuring type safety across frontend/backend boundary.

**Development**:
```bash
pnpm --filter @wcp/wario-backend start:debug  # Debug mode with watch
pnpm backend:start                             # Alias from root
```

**Testing**:
```bash
cd apps/wario-backend
pnpm test          # Unit tests
pnpm test:e2e      # E2E tests
pnpm test:cov      # Coverage
```

### Auth0 Integration

**wario-pos** uses Auth0 for authentication:

```typescript
// apps/wario-pos/src/config.ts
auth0: {
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  callbackUrl: import.meta.env.VITE_AUTH0_CALLBACK_URL,
  scope: import.meta.env.VITE_AUTH0_SCOPE,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE
}
```

Protected routes use `@auth0/auth0-react` provider wrapping the app.

## Code Conventions

### Import Sorting (Enforced by ESLint)

Imports must follow this exact order (auto-fixable via `eslint-plugin-perfectionist`):

1. Side effects (CSS, setup)
2. Built-ins / external deps
3. **Custom groups** (in order):
   - `@mui/*` imports
   - `@wcp/*` workspace packages
   - `@/routes/*` or `src/routes/*`
   - `@/hooks/*`, `@/utils/*`, `@/components/*`, `@/sections/*`
   - `@/auth/*` or `src/auth/*`
   - `@/types/*`
4. Internal relative imports (parent/sibling)
5. Unknown

**Named imports** are alphabetically sorted. One blank line between groups.

Example:
```typescript
import './index.css';

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { Box, Typography } from '@mui/material';

import { WDateUtils } from '@wcp/wario-shared';
import { LoadingScreen, SelectProductMetadata } from '@wcp/wario-ux-shared';

import { store } from '@/app/store';
import { usePathname } from '@/routes/hooks';

import App from './App';
```

### TypeScript Conventions

- **Strict mode enabled** (`tsconfig.base.json`)
- Use `type` imports where possible: `import type { Foo } from 'bar'` or `import { type Foo } from 'bar'`
- Unused params/vars prefixed with `_` (e.g., `_unusedParam`)
- Target: ES2022, module resolution: Bundler
- `verbatimModuleSyntax: true` - be explicit about type-only imports

### Path Aliases

Frontend apps use `@/` and `src/` aliases mapped to `./src`:

```typescript
import { CONFIG } from '@/config';
import { store } from '@/redux/store';
```

Packages use relative imports or their own internal aliases.

## Redux Architecture

### State Shape

Apps use **normalized entities** via Redux Toolkit's `createEntityAdapter`. Example from `wario-ux-shared/src/redux/SocketIoSlice.ts`:

```typescript
export interface SocketIoState {
  catalog: ICatalog | null;
  products: EntityState<CatalogProductEntry, string>;
  productInstances: EntityState<IProductInstance, string>;
  categories: EntityState<CatalogCategoryEntry, string>;
  modifierOptions: EntityState<IOption, string>;
  fulfillments: EntityState<FulfillmentConfig, string>;
  settings: IWSettings | null;
  status: 'NONE' | 'START' | 'CONNECTED' | 'FAILED';
  // ... timing fields
}
```

### Store Composition

Each app combines reducers differently:

**wario-fe-menu**:
```typescript
combineReducers({
  fulfillment: WFulfillmentReducer,
  ws: SocketIoReducer  // from wario-ux-shared
});
```

**wario-fe-order** (most complex):
```typescript
combineReducers({
  fulfillment: WFulfillmentReducer,
  customizer: WCustomizerReducer,
  cart: WCartReducer,
  ci: WCustomerInfoReducer,
  ws: SocketIoReducer,
  metrics: WMetricsReducer,
  payment: WPaymentReducer,
  stepper: StepperReducer
});
```

### Selectors

Use **memoized selectors** from `reselect`:

```typescript
export const SelectOptionState = createSelector(
  (s: WCustomizerState) => s.selectedProduct?.m.modifier_map || {},
  (_: WCustomizerState, mtId: string) => mtId,
  (_: WCustomizerState, _: string, moId: string) => moId,
  (modifierMap, mtId, moId) => modifierMap[mtId]?.options[moId]
);
```

Custom helper: `weakMapCreateSelector` (from `wario-ux-shared/src/redux/selectorHelpers.ts`) for entity lookups.

### Middleware Pattern

Apps use **custom SocketIoMiddleware** from `wario-ux-shared`:

```typescript
// In app's SocketIoMiddleware.ts
import { SocketIoMiddleware as MiddlewareGenerator } from '@wcp/wario-ux-shared';
import { HOST_API, SOCKETIO } from '../../config';

export const SocketIoMiddleware = MiddlewareGenerator<RootState>(
  HOST_API, 
  SOCKETIO.ns
);
```

Then configured in store:

```typescript
configureStore({
  reducer: RootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat([SocketIoMiddleware, /* ... */])
});
```

## Socket.io Integration

Frontend apps connect to backend via socket.io with these events:

- `WCP_CATALOG` → dispatches `receiveCatalog()`
- `WCP_FULFILLMENTS` → dispatches `receiveFulfillments()`
- `WCP_SERVER_TIME` → dispatches `receiveServerTime()`
- `WCP_SETTINGS` → dispatches `receiveSettings()`

Connection initiated by dispatching `startConnection()` action. See `wario-ux-shared/src/redux/SocketIoMiddleware.ts`.

## Environment Variables

Apps use Vite env vars (prefix `VITE_`). Example from `.env`:

```bash
VITE_HOST_API_KEY=https://wario.windycitypie.com
VITE_SOCKETIO_NS=nsRO
VITE_MUI_KEY=<license-key>
VITE_AUTH0_CLIENT_ID=<client-id>
VITE_AUTH0_DOMAIN=<domain>
```

Accessed via `import.meta.env.VITE_*` in frontend code.

## Package Publishing

**wario-shared** is published to npm with dual ESM/CJS output:

```typescript
// tsup.config.ts
export default defineConfig({
  format: ['esm', 'cjs'],
  outExtension({ format }) {
    return format === 'cjs' ? { js: '.cjs' } : { js: '.js' };
  }
});
```

Uses `@changesets/cli` for versioning. Run `pnpm changeset` to create version bump requests.

## Deployment

Frontend apps deploy via rsync to production server:

```bash
pnpm menu:deploy:prod   # Deploys to windycitypie.com
pnpm menu:deploy:test   # Deploys to test environment
```

Deployment scripts in individual app `package.json` files use rsync with SSH.

## Monorepo Best Practices

### Scaffolding New Components

**Use proper creation tools**:
- Frontend apps: `pnpm create vite@latest` (React + TypeScript + SWC)
- Backend: `nest` CLI for modules, controllers, services
- Packages: `pnpm create vite@latest` with library mode for React packages, `tsup` for pure TS

**Folder Structure**:
```
wario-monorepo/
├── pnpm-workspace.yaml      # Workspace definition
├── package.json             # Root scripts & dev deps
├── tsconfig.base.json       # Shared TS config
├── eslint.config.mjs        # Shared ESLint config (inherited)
├── apps/                    # All applications
│   └── wario-*/
│       ├── src/
│       ├── package.json     # workspace:* deps
│       ├── tsconfig.json    # extends ../../tsconfig.base.json
│       └── vite.config.ts   # or nest-cli.json
└── packages/                # Shared libraries
    └── wario-*/
        ├── src/
        ├── package.json     # workspace:* deps
        ├── tsconfig.json
        └── vite.config.ts   # library mode OR tsup.config.ts
```

**Consistent Syntax**:
- All TypeScript configs extend `tsconfig.base.json`
- All ESLint configs inherit from root `eslint.config.mjs`
- All apps use same dependency versions (managed at root)
- Path aliases (`@/`, `src/`) configured identically across apps

### Type Exports

**wario-shared** exports types used by backend API:

```typescript
// packages/wario-shared/src/index.ts
export * from "./lib/types";
export * from "./lib/objects/ICatalog";
export * from "./lib/objects/WCPProduct";
// ... etc
```

**Backend consumes**:
```typescript
// apps/wario-backend/src/*.ts
import type { ICatalog, WProduct } from '@wcp/wario-shared';
```

Ensures frontend and backend share identical type definitions.

## Key Files to Reference

- **Monorepo config**: `pnpm-workspace.yaml`, root `package.json`
- **TypeScript**: `tsconfig.base.json` (shared), per-app `tsconfig.json`
- **Linting**: `eslint.config.mjs` (root, inherited by all)
- **Redux patterns**: `packages/wario-ux-shared/src/redux/SocketIoSlice.ts`
- **Socket middleware**: `packages/wario-ux-shared/src/redux/SocketIoMiddleware.ts`
- **Business logic**: `packages/wario-shared/src/lib/objects/`
- **Auth0 config**: `apps/wario-pos/src/config.ts`

## Common Pitfalls

1. **Forgetting to rebuild packages**: After changing `wario-shared` or `wario-ux-shared`, run `pnpm pkgs:build` before testing apps.
2. **Import order violations**: Run `pnpm lint --fix` to auto-sort imports per perfectionist rules.
3. **Wrong port**: Check `.env` files for correct `VITE_HOST_API_KEY` and port configs.
4. **Entity adapter confusion**: Use adapter selectors (`getProductById`, `selectAll`, etc.) for normalized state access.
5. **Testing non-existent suites**: Only `wario-shared` and `wario-backend` have Jest configured.
6. **Using npm instead of pnpm**: Always use `pnpm` commands, never `npm`.
7. **Breaking type contracts**: When changing types in `wario-shared`, verify backend API compatibility.
8. **Wrong package for components**: 
   - `wario-ux-shared` → pos, menu, order
   - `wario-fe-ux-shared` → menu, order, faq, credit

## When Adding Features

1. **New shared logic**: Add to `wario-shared/src/lib/` (pure TS, no React/Redux)
2. **New Redux slice**: Consider if it belongs in app or `wario-ux-shared`
3. **New UI component**: 
   - Used by pos/menu/order → `wario-ux-shared`
   - Used by menu/order/faq/credit → `wario-fe-ux-shared`
   - App-specific → in app's `src/components/`
4. **New API route**: Add to `wario-backend` using NestJS CLI:
   ```bash
   cd apps/wario-backend
   nest g module features/orders
   nest g controller features/orders
   nest g service features/orders
   ```
5. **New type**: If used by backend API, add to `wario-shared/src/lib/types.ts`
6. **Database entity**: Use TypeORM decorators in `wario-backend/src/entities/`

## Scaffolding Guide

**Creating this monorepo from scratch**:

```bash
# 1. Initialize monorepo
mkdir wario-monorepo && cd wario-monorepo
pnpm init

# 2. Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - apps/*
  - packages/*
EOF

# 3. Create base TypeScript config
# (tsconfig.base.json - strict: true, target: ES2022, moduleResolution: Bundler)

# 4. Scaffold backend
mkdir -p apps && cd apps
nest new wario-backend
# Configure TypeORM, GraphQL, Socket.io

# 5. Scaffold frontend apps
pnpm create vite@latest wario-pos -- --template react-ts
pnpm create vite@latest wario-fe-menu -- --template react-ts
pnpm create vite@latest wario-fe-order -- --template react-ts
pnpm create vite@latest wario-fe-credit -- --template react-ts
pnpm create vite@latest wario-fe-faq -- --template react-ts

# 6. Scaffold packages
cd ../packages
pnpm create vite@latest wario-shared -- --template vanilla-ts
pnpm create vite@latest wario-ux-shared -- --template react-ts
pnpm create vite@latest wario-fe-ux-shared -- --template react-ts

# 7. Configure each package.json with workspace:* deps
# 8. Set up Vite library mode for packages
# 9. Install shared dependencies at root
# 10. Configure ESLint (eslint.config.mjs) with perfectionist
```

**Version Alignment**: Ensure React 19, Vite 7.1, TypeScript 5.9, NestJS 11, pnpm 10.x across all workspaces.

## Questions to Ask User

- What environment (.env) should be used for this feature? (dev/test/prod)
- Does this change require a changeset for package versioning?
- Should new business logic be published to npm (goes in wario-shared) or stay internal?
- Which apps will consume this component? (determines package placement)
- Does this feature require database changes? (TypeORM migration needed?)
