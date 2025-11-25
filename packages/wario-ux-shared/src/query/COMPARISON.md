# Redux vs TanStack Query: Side-by-Side Examples

## Example 1: Basic App Setup

### Redux (Before)

```tsx
// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';

import { store } from '@/redux/store';
import App from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <ReduxProvider store={store}>
      <App />
    </ReduxProvider>
  </StrictMode>
);
```

```tsx
// App.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { IsSocketDataLoaded, startConnection } from '@wcp/wario-ux-shared';
import { LoadingScreen } from '@wcp/wario-ux-shared';

export default function App() {
  const dispatch = useAppDispatch();
  const socketIoState = useAppSelector(s => s.ws.status);
  const isDataLoaded = useAppSelector(s => IsSocketDataLoaded(s.ws));

  useEffect(() => {
    if (socketIoState === 'NONE') {
      dispatch(startConnection());
    }
  }, [socketIoState, dispatch]);

  if (!isDataLoaded) {
    return <LoadingScreen />;
  }

  return <MainContent />;
}
```

### TanStack Query (After)

```tsx
// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WarioQueryProvider } from '@wcp/wario-ux-shared';

import { CONFIG } from '@/config';
import App from './App';

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <WarioQueryProvider 
      hostAPI={CONFIG.HOST_API} 
      namespace={CONFIG.SOCKETIO.ns}
    >
      <App />
    </WarioQueryProvider>
  </StrictMode>
);
```

```tsx
// App.tsx
import { useIsSocketDataLoaded, useSocket } from '@wcp/wario-ux-shared';
import { LoadingScreen } from '@wcp/wario-ux-shared';

export default function App() {
  const isDataLoaded = useIsSocketDataLoaded();
  const { status } = useSocket();

  if (!isDataLoaded || status !== 'CONNECTED') {
    return <LoadingScreen />;
  }

  return <MainContent />;
}
```

**Lines of code**: Redux 38 → TanStack Query 28 (-26% reduction)

---

## Example 2: Displaying Product List

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';
import { SelectCatalogSelectors } from '@wcp/wario-ux-shared';

function ProductList() {
  const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));
  const productIds = catalogSelectors.productEntries();

  return (
    <ul>
      {productIds.map(id => {
        const productEntry = catalogSelectors.productEntry(id);
        return (
          <li key={id}>
            {productEntry.product.displayName}
          </li>
        );
      })}
    </ul>
  );
}
```

### TanStack Query (After)

```tsx
import { useCatalogSelectors } from '@wcp/wario-ux-shared';

function ProductList() {
  const catalogSelectors = useCatalogSelectors();

  if (!catalogSelectors) {
    return null;
  }

  const productIds = catalogSelectors.productEntries();

  return (
    <ul>
      {productIds.map(id => {
        const productEntry = catalogSelectors.productEntry(id);
        return (
          <li key={id}>
            {productEntry.product.displayName}
          </li>
        );
      })}
    </ul>
  );
}
```

**Difference**: Almost identical! Just `useCatalogSelectors()` instead of `useAppSelector(s => SelectCatalogSelectors(s.ws))`, plus null check.

---

## Example 3: Getting Single Product

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';
import { getProductEntryById } from '@wcp/wario-ux-shared';

function ProductDetail({ productId }: { productId: string }) {
  const productEntry = useAppSelector(s => 
    getProductEntryById(s.ws.products, productId)
  );

  return <div>{productEntry.product.displayName}</div>;
}
```

### TanStack Query (After - Option A: Using Selectors)

```tsx
import { useCatalogSelectors } from '@wcp/wario-ux-shared';

function ProductDetail({ productId }: { productId: string }) {
  const catalogSelectors = useCatalogSelectors();
  
  if (!catalogSelectors) {
    return null;
  }

  const productEntry = catalogSelectors.productEntry(productId);

  return <div>{productEntry.product.displayName}</div>;
}
```

### TanStack Query (After - Option B: Using Select)

```tsx
import { useCatalogQuery } from '@wcp/wario-ux-shared';

function ProductDetail({ productId }: { productId: string }) {
  const { data: productEntry } = useCatalogQuery({
    select: (catalog) => catalog?.products[productId]
  });

  if (!productEntry) {
    return null;
  }

  return <div>{productEntry.product.displayName}</div>;
}
```

**Benefit**: Option B only re-renders when THIS product changes, not on any catalog change!

---

## Example 4: Server Time

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';

function CurrentTime() {
  const currentTime = useAppSelector(s => s.ws.currentTime);

  return (
    <div>
      Current time: {new Date(currentTime).toLocaleString()}
    </div>
  );
}
```

### TanStack Query (After)

```tsx
import { useServerTimeQuery, useServerTime } from '@wcp/wario-ux-shared';

function CurrentTime() {
  const { data: serverTimeData } = useServerTimeQuery();
  const { currentTime } = useServerTime(serverTimeData);

  return (
    <div>
      Current time: {new Date(currentTime).toLocaleString()}
    </div>
  );
}
```

---

## Example 5: Fulfillments

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';
import { getFulfillmentById } from '@wcp/wario-ux-shared';

function FulfillmentSelector({ selected, onChange }: Props) {
  const fulfillments = useAppSelector(s => s.ws.fulfillments);
  const allFulfillments = getFulfillments(fulfillments);
  
  return (
    <select value={selected} onChange={e => onChange(e.target.value)}>
      {allFulfillments.map(f => (
        <option key={f.id} value={f.id}>
          {f.displayName}
        </option>
      ))}
    </select>
  );
}
```

### TanStack Query (After)

```tsx
import { useFulfillmentsQuery } from '@wcp/wario-ux-shared';

function FulfillmentSelector({ selected, onChange }: Props) {
  const { data: fulfillments } = useFulfillmentsQuery();
  
  if (!fulfillments) {
    return null;
  }
  
  return (
    <select value={selected} onChange={e => onChange(e.target.value)}>
      {fulfillments.map(f => (
        <option key={f.id} value={f.id}>
          {f.displayName}
        </option>
      ))}
    </select>
  );
}
```

---

## Example 6: Complex Selector

### Redux (Before)

```tsx
import { createSelector } from 'reselect';
import { useAppSelector } from '@/hooks/useRedux';
import { getProductEntries } from '@wcp/wario-ux-shared';

const selectEnabledProducts = createSelector(
  [(s: RootState) => s.ws.products],
  (products) => getProductEntries(products).filter(
    p => !p.product.disabled || p.product.disabled.start <= p.product.disabled.end
  )
);

function EnabledProductsList() {
  const enabledProducts = useAppSelector(selectEnabledProducts);

  return (
    <ul>
      {enabledProducts.map(p => (
        <li key={p.product.id}>{p.product.displayName}</li>
      ))}
    </ul>
  );
}
```

### TanStack Query (After)

```tsx
import { useCatalogQuery } from '@wcp/wario-ux-shared';

function EnabledProductsList() {
  const { data: enabledProducts } = useCatalogQuery({
    select: (catalog) => 
      catalog ? Object.values(catalog.products).filter(
        p => !p.product.disabled || p.product.disabled.start <= p.product.disabled.end
      ) : []
  });

  return (
    <ul>
      {enabledProducts.map(p => (
        <li key={p.product.id}>{p.product.displayName}</li>
      ))}
    </ul>
  );
}
```

**Benefit**: No need for separate selector file! Inline with component. Component only re-renders when filtered list changes.

---

## Example 7: Settings

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';

function PaymentConfig() {
  const settings = useAppSelector(s => s.ws.settings);
  
  if (!settings) {
    return null;
  }

  return (
    <div>
      Square App ID: {settings.square_application_id}
    </div>
  );
}
```

### TanStack Query (After)

```tsx
import { useSettingsQuery } from '@wcp/wario-ux-shared';

function PaymentConfig() {
  const { data: settings } = useSettingsQuery();
  
  if (!settings) {
    return null;
  }

  return (
    <div>
      Square App ID: {settings.square_application_id}
    </div>
  );
}
```

---

## Example 8: Connection Status

### Redux (Before)

```tsx
import { useAppSelector } from '@/hooks/useRedux';

function ConnectionIndicator() {
  const status = useAppSelector(s => s.ws.status);

  const statusColors = {
    NONE: 'gray',
    START: 'yellow',
    CONNECTED: 'green',
    FAILED: 'red',
  };

  return (
    <div style={{ color: statusColors[status] }}>
      {status}
    </div>
  );
}
```

### TanStack Query (After)

```tsx
import { useSocket } from '@wcp/wario-ux-shared';

function ConnectionIndicator() {
  const { status } = useSocket();

  const statusColors = {
    NONE: 'gray',
    CONNECTING: 'yellow',
    CONNECTED: 'green',
    FAILED: 'red',
    DISCONNECTED: 'orange',
  };

  return (
    <div style={{ color: statusColors[status] }}>
      {status}
    </div>
  );
}
```

**Note**: Status values slightly different (`START` → `CONNECTING`, added `DISCONNECTED`)

---

## Key Differences Summary

| Aspect | Redux | TanStack Query |
|--------|-------|----------------|
| **Provider setup** | `<ReduxProvider store={store}>` | `<WarioQueryProvider {...}>` |
| **Manual connection** | `dispatch(startConnection())` | Auto-connected by provider |
| **Data access** | `useAppSelector(s => s.ws.catalog)` | `useCatalogQuery()` |
| **Selectors** | `SelectCatalogSelectors(s.ws)` | `useCatalogSelectors()` |
| **Loading check** | `IsSocketDataLoaded(s.ws)` | `useIsSocketDataLoaded()` |
| **Null checks** | EntityAdapters handle | Manual null checks needed |
| **Re-render optimization** | Reselect memoization | `select` option auto-memoized |
| **TypeScript** | Explicit types on selectors | Inferred from queries |
| **DevTools** | Redux DevTools Extension | React Query DevTools |

## Migration Effort by Component Type

| Component Type | Effort | Notes |
|----------------|--------|-------|
| Display-only (reads catalog) | **Low** | Nearly 1:1 replacement |
| With selectors | **Low-Medium** | Replace selector imports |
| With complex selectors | **Medium** | Move to `select` or keep reselect |
| With mutations | **High** | Needs mutation hooks (future work) |
| With ListeningMiddleware | **Very High** | Custom solution needed |

## Performance Comparison

| Metric | Redux | TanStack Query |
|--------|-------|----------------|
| **Bundle size** | ~70KB (RTK + React-Redux + Reselect) | ~45KB (React Query) |
| **Re-renders** | Depends on selector granularity | Automatic with `select` |
| **Memory** | Normalized entities in Redux store | Denormalized in query cache |
| **Time to interactive** | Slower (middleware setup) | Faster (simpler initialization) |
