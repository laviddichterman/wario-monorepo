# Migration Guide: Redux → TanStack Query

Step-by-step guide for migrating from Redux-based socket state to TanStack Query.

## Phase 1: Add Dependencies (Per App)

### 1. Install TanStack Query

Each app needs to add `@tanstack/react-query` as a dependency:

```bash
# For wario-pos
cd apps/wario-pos
pnpm add @tanstack/react-query@^5.62.0

# For wario-fe-order
cd apps/wario-fe-order
pnpm add @tanstack/react-query@^5.62.0

# Repeat for wario-fe-menu, wario-fe-credit
```

### 2. Optional: Add DevTools for Development

```bash
pnpm add -D @tanstack/react-query-devtools
```

## Phase 2: Dual-Mode Operation

Run **both Redux and TanStack Query** side-by-side during transition.

### Update `main.tsx` / `index.tsx`

```tsx
// Before
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/redux/store';

root.render(
  <StrictMode>
    <ReduxProvider store={store}>
      <App />
    </ReduxProvider>
  </StrictMode>
);

// After (dual-mode)
import { Provider as ReduxProvider } from 'react-redux';
import { WarioQueryProvider } from '@wcp/wario-ux-shared';
import { store } from '@/redux/store';
import { CONFIG } from '@/config';

root.render(
  <StrictMode>
    <ReduxProvider store={store}>
      <WarioQueryProvider 
        hostAPI={CONFIG.HOST_API} 
        namespace={CONFIG.SOCKETIO.ns}
      >
        <App />
      </WarioQueryProvider>
    </ReduxProvider>
  </StrictMode>
);
```

**Note**: Both socket connections will run. This is temporary and acceptable during migration.

### Optional: Add DevTools

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<WarioQueryProvider {...}>
  <App />
  {process.env.NODE_ENV === 'development' && (
    <ReactQueryDevtools initialIsOpen={false} />
  )}
</WarioQueryProvider>
```

## Phase 3: Migrate Components Incrementally

### Example 1: Simple Selector Migration

**Before (Redux)**:
```tsx
import { useAppSelector } from '@/hooks/useRedux';

function ProductCount() {
  const products = useAppSelector(s => s.ws.products);
  const productIds = getProductEntries(products);
  
  return <div>{productIds.length} products</div>;
}
```

**After (TanStack Query)**:
```tsx
import { useCatalogQuery } from '@wcp/wario-ux-shared';

function ProductCount() {
  const { data: catalog } = useCatalogQuery({
    select: (catalog) => catalog?.products.length ?? 0
  });
  
  return <div>{catalog} products</div>;
}
```

### Example 2: Catalog Selectors

**Before (Redux)**:
```tsx
import { useAppSelector } from '@/hooks/useRedux';
import { SelectCatalogSelectors } from '@wcp/wario-ux-shared';

function ProductList() {
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const productEntry = catalogSelectors.productEntry('product-id');
  
  return <div>{productEntry.product.name}</div>;
}
```

**After (TanStack Query)**:
```tsx
import { useCatalogSelectors } from '@wcp/wario-ux-shared';

function ProductList() {
  const catalogSelectors = useCatalogSelectors();
  
  if (!catalogSelectors) {
    return <LoadingScreen />;
  }
  
  const productEntry = catalogSelectors.productEntry('product-id');
  return <div>{productEntry.product.name}</div>;
}
```

### Example 3: Loading State

**Before (Redux)**:
```tsx
import { useAppSelector } from '@/hooks/useRedux';
import { IsSocketDataLoaded } from '@wcp/wario-ux-shared';

function App() {
  const isDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));
  
  if (!isDataLoaded) {
    return <LoadingScreen />;
  }
  
  return <MainContent />;
}
```

**After (TanStack Query)**:
```tsx
import { useIsSocketDataLoaded, useSocket } from '@wcp/wario-ux-shared';

function App() {
  const isDataLoaded = useIsSocketDataLoaded();
  const { status } = useSocket();
  
  if (!isDataLoaded || status !== 'CONNECTED') {
    return <LoadingScreen />;
  }
  
  return <MainContent />;
}
```

### Example 4: Connection Status

**Before (Redux)**:
```tsx
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { startConnection } from '@wcp/wario-ux-shared';

function ConnectionStatus() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.ws.status);
  
  useEffect(() => {
    if (status === 'NONE') {
      dispatch(startConnection());
    }
  }, [status, dispatch]);
  
  return <div>Status: {status}</div>;
}
```

**After (TanStack Query)**:
```tsx
import { useSocket } from '@wcp/wario-ux-shared';

function ConnectionStatus() {
  const { status } = useSocket();
  
  // No need to manually connect - WarioQueryProvider handles it
  
  return <div>Status: {status}</div>;
}
```

### Example 5: Server Time

**Before (Redux)**:
```tsx
import { useAppSelector } from '@/hooks/useRedux';

function CurrentTime() {
  const currentTime = useAppSelector(s => s.ws.currentTime);
  
  return <div>{new Date(currentTime).toLocaleString()}</div>;
}
```

**After (TanStack Query)**:
```tsx
import { useServerTimeQuery, useServerTime } from '@wcp/wario-ux-shared';

function CurrentTime() {
  const { data: serverTimeData } = useServerTimeQuery();
  const { currentTime } = useServerTime(serverTimeData);
  
  return <div>{new Date(currentTime).toLocaleString()}</div>;
}
```

## Phase 4: Update Complex Selectors

For complex selectors that use `createSelector` from `reselect`, you have two options:

### Option A: Keep Using Reselect

```tsx
import { createSelector } from 'reselect';
import { useCatalogQuery } from '@wcp/wario-ux-shared';

const selectProductNames = createSelector(
  [(catalog: ICatalog | null) => catalog?.products ?? []],
  (products) => products.map(p => p.product.displayName)
);

function ProductNames() {
  const { data: catalog } = useCatalogQuery();
  const names = selectProductNames(catalog);
  
  return <ul>{names.map(n => <li key={n}>{n}</li>)}</ul>;
}
```

### Option B: Use TanStack Query `select`

```tsx
import { useCatalogQuery } from '@wcp/wario-ux-shared';

function ProductNames() {
  const { data: names } = useCatalogQuery({
    select: (catalog) => catalog?.products.map(p => p.product.displayName) ?? []
  });
  
  return <ul>{names.map(n => <li key={n}>{n}</li>)}</ul>;
}
```

## Phase 5: Remove Redux (Per Component)

Once a component is fully migrated to TanStack Query:

1. Remove Redux imports (`useAppSelector`, `useAppDispatch`)
2. Remove Redux selectors
3. Test thoroughly
4. Commit changes

## Phase 6: Clean Up (Per App)

Once **all components** in an app are migrated:

### 1. Remove Redux Provider

```tsx
// Remove ReduxProvider wrapper
root.render(
  <StrictMode>
    <WarioQueryProvider {...}>
      <App />
    </WarioQueryProvider>
  </StrictMode>
);
```

### 2. Delete Redux Files

```bash
# Per app
rm -rf src/redux/
rm -rf src/app/slices/SocketIoMiddleware.ts  # If exists
```

### 3. Remove Redux Dependencies

```json
// package.json - remove these
{
  "dependencies": {
    "@reduxjs/toolkit": "...",  // Remove
    "react-redux": "...",        // Remove
    "redux": "...",              // Remove
    "reselect": "..."            // Remove if not used elsewhere
  }
}
```

```bash
pnpm install
```

### 4. Remove Redux Hooks

```bash
# If you have custom hooks
rm src/hooks/useRedux.ts
rm src/app/useHooks.ts
```

## Migration Checklist (Per App)

- [ ] Install `@tanstack/react-query`
- [ ] Add `WarioQueryProvider` to app root (keep Redux provider)
- [ ] Migrate loading screens (`IsSocketDataLoaded` → `useIsSocketDataLoaded`)
- [ ] Migrate connection status checks (`s.ws.status` → `useSocket().status`)
- [ ] Migrate catalog reads (`s.ws.catalog` → `useCatalogQuery()`)
- [ ] Migrate fulfillment reads (`s.ws.fulfillments` → `useFulfillmentsQuery()`)
- [ ] Migrate settings reads (`s.ws.settings` → `useSettingsQuery()`)
- [ ] Migrate time sync (`s.ws.currentTime` → `useServerTime()`)
- [ ] Migrate complex selectors (`SelectCatalogSelectors` → `useCatalogSelectors`)
- [ ] Remove `dispatch(startConnection())` calls (auto-connected by provider)
- [ ] Test all components work with TanStack Query
- [ ] Remove Redux provider
- [ ] Delete Redux files
- [ ] Remove Redux dependencies
- [ ] Run full app test
- [ ] Commit and push

## Common Patterns

### Pattern: Optional Chaining

TanStack Query returns `null` initially, so use optional chaining:

```tsx
// Redux (null-safe via entity adapters)
const product = getProductEntryById(s.ws.products, id);

// TanStack Query (manual null check)
const { data: catalog } = useCatalogQuery();
const product = catalog?.products.find(p => p.product.id === id);
```

### Pattern: Multiple Queries

```tsx
// All queries can be called in parallel
const { data: catalog } = useCatalogQuery();
const { data: fulfillments } = useFulfillmentsQuery();
const { data: settings } = useSettingsQuery();

// All queries suspend together if using Suspense
```

### Pattern: Derived Data

```tsx
// Keep derived logic in custom hooks
function useProductMetadata(productId: string) {
  const { data: catalog } = useCatalogQuery();
  const catalogSelectors = useCatalogSelectors();
  
  return useMemo(() => {
    if (!catalog || !catalogSelectors) return null;
    // Compute metadata
    return WCPProductGenerateMetadata(...);
  }, [catalog, catalogSelectors, productId]);
}
```

## Troubleshooting

### Issue: Data is `null` even though socket is connected

**Cause**: Socket event hasn't fired yet.

**Solution**: Check socket connection in DevTools. Add loading state:

```tsx
const { data: catalog, isLoading } = useCatalogQuery();
const { status } = useSocket();

if (isLoading || status !== 'CONNECTED') {
  return <LoadingScreen />;
}
```

### Issue: Multiple socket connections

**Cause**: Both Redux middleware and `SocketProvider` are connecting.

**Solution**: This is expected during dual-mode. Once migration is complete, remove Redux provider.

### Issue: Types don't match

**Cause**: Redux used `EntityState` for normalized data. TanStack Query uses plain arrays.

**Solution**: Update type expectations:

```tsx
// Before: EntityState<CatalogProductEntry, string>
const products: EntityState<CatalogProductEntry, string>;

// After: CatalogProductEntry[]
const products: CatalogProductEntry[];
```

### Issue: Performance regression

**Cause**: Over-selecting data in components.

**Solution**: Use `select` option to minimize re-renders:

```tsx
// Bad - component re-renders on any catalog change
const { data: catalog } = useCatalogQuery();
const product = catalog?.products.find(p => p.product.id === id);

// Good - component only re-renders when this product changes
const { data: product } = useCatalogQuery({
  select: (catalog) => catalog?.products.find(p => p.product.id === id)
});
```

## Timeline Recommendation

For a large app like `wario-fe-order`:

- **Week 1**: Install dependencies, add dual-mode providers, migrate App.tsx loading screen
- **Week 2**: Migrate simple components (display-only, no complex selectors)
- **Week 3**: Migrate complex selectors and business logic
- **Week 4**: Remove Redux, test thoroughly, deploy

For smaller apps like `wario-fe-menu`:

- **Day 1**: Install, dual-mode, migrate all components
- **Day 2**: Remove Redux, test, deploy
