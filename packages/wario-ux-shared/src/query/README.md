# TanStack Query Integration for Wario

Modern state management using TanStack Query + Socket.io, replacing Redux for server cache.

## Architecture

This module provides a **hybrid push-pull model** for real-time data:

- **Socket.io** manages WebSocket connection and receives server-pushed data
- **TanStack Query** caches the data and provides React hooks for accessing it
- Data flows: `Server → Socket.io → QueryClient.setQueryData() → React components`

## Quick Start

### 1. Wrap your app with `WarioQueryProvider`

```tsx
import { WarioQueryProvider } from '@wcp/wario-ux-shared';

function App() {
  return (
    <WarioQueryProvider 
      hostAPI="https://wario.windycitypie.com" 
      namespace="nsPOS"
    >
      <YourApp />
    </WarioQueryProvider>
  );
}
```

### 2. Use query hooks in components

```tsx
import { useCatalogQuery, useSettingsQuery, useSocket } from '@wcp/wario-ux-shared';

function MyComponent() {
  const { data: catalog, isLoading } = useCatalogQuery();
  const { data: settings } = useSettingsQuery();
  const { status } = useSocket();

  if (isLoading || status !== 'CONNECTED') {
    return <LoadingScreen />;
  }

  return <div>{catalog?.products.length} products</div>;
}
```

### 3. Access server time synchronization

```tsx
import { useServerTimeQuery, useServerTime } from '@wcp/wario-ux-shared';

function TimeDisplay() {
  const { data: serverTimeData } = useServerTimeQuery();
  const timeSync = useServerTime(serverTimeData);

  return <div>Server time: {timeSync.currentTime}</div>;
}
```

## Available Hooks

### Query Hooks

- `useCatalogQuery()` - Full catalog data (products, categories, modifiers, options)
- `useCatalogSelectors()` - Selector functions similar to Redux `SelectCatalogSelectors`
- `useFulfillmentsQuery()` - Fulfillment configurations
- `useFulfillmentById(id)` - Single fulfillment by ID
- `useSettingsQuery()` - Application settings
- `useServerTimeQuery()` - Raw server time data from socket
- `useServerTime(serverTimeData)` - Synchronized current time with polling

### Context Hooks

- `useSocket()` - Access socket connection status and control
  - `status: SocketStatus` - Current connection state
  - `socket: Socket | null` - Socket.io instance
  - `connect()` - Manually connect socket
  - `disconnect()` - Disconnect socket

## Query Keys

All queries use stable query keys exported from `types.ts`:

```typescript
QUERY_KEYS.catalog        // ['catalog']
QUERY_KEYS.fulfillments   // ['fulfillments']
QUERY_KEYS.settings       // ['settings']
QUERY_KEYS.serverTime     // ['serverTime']
```

Use these for manual cache updates:

```typescript
import { QUERY_KEYS } from '@wcp/wario-ux-shared';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.catalog });
```

## Socket.io Events

The provider listens to these socket events and updates query cache:

- `WCP_CATALOG` → Updates `catalog` query
- `WCP_FULFILLMENTS` → Updates `fulfillments` query
- `WCP_SERVER_TIME` → Updates `serverTime` query
- `WCP_SETTINGS` → Updates `settings` query

## Migration from Redux

### Before (Redux)

```tsx
// main.tsx
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './redux/store';

<ReduxProvider store={store}>
  <App />
</ReduxProvider>

// Component
import { useAppSelector, useAppDispatch } from './hooks/useRedux';
import { startConnection } from '@wcp/wario-ux-shared';

const dispatch = useAppDispatch();
const catalog = useAppSelector(s => s.ws.catalog);
const catalogSelectors = useAppSelector(s => SelectCatalogSelectors(s.ws));

useEffect(() => {
  if (socketIoState === 'NONE') {
    dispatch(startConnection());
  }
}, [socketIoState, dispatch]);
```

### After (TanStack Query)

```tsx
// main.tsx
import { WarioQueryProvider } from '@wcp/wario-ux-shared';

<WarioQueryProvider hostAPI={HOST_API} namespace={SOCKETIO.ns}>
  <App />
</WarioQueryProvider>

// Component
import { useCatalogQuery, useCatalogSelectors, useSocket } from '@wcp/wario-ux-shared';

const { data: catalog } = useCatalogQuery();
const catalogSelectors = useCatalogSelectors();
const { status } = useSocket(); // Auto-connected by provider
```

## Advanced Usage

### Custom QueryClient

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@wcp/wario-ux-shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 10 },
  },
});

<QueryClientProvider client={queryClient}>
  <SocketProvider hostAPI={hostAPI} namespace={namespace}>
    <App />
  </SocketProvider>
</QueryClientProvider>
```

### Manual Connection Control

```tsx
import { WarioQueryProvider } from '@wcp/wario-ux-shared';

// Disable auto-connect
<WarioQueryProvider autoConnect={false} {...}>
  <App />
</WarioQueryProvider>

// Manually connect later
function LoginButton() {
  const { connect, status } = useSocket();
  
  return (
    <button onClick={connect} disabled={status === 'CONNECTED'}>
      Connect
    </button>
  );
}
```

### Selecting Specific Data

```tsx
// Only get product count, not full catalog
const { data: productCount } = useCatalogQuery({
  select: (catalog) => catalog?.products.length ?? 0,
});

// Get single fulfillment
const { data: fulfillment } = useFulfillmentById('delivery-id');
```

## Type Safety

All hooks are fully typed using types from `@wcp/wario-shared`:

```typescript
import type { ICatalog, FulfillmentConfig, IWSettings } from '@wcp/wario-shared';

const { data: catalog } = useCatalogQuery(); // catalog: ICatalog | null
const { data: fulfillments } = useFulfillmentsQuery(); // fulfillments: FulfillmentConfig[] | null
const { data: settings } = useSettingsQuery(); // settings: IWSettings | null
```

## Performance Considerations

- **Infinite staleTime**: Socket queries never refetch (data is push-based)
- **Infinite gcTime**: Data stays in cache forever (cleared on page reload)
- **No polling**: Time sync uses `setInterval`, not TanStack Query polling
- **Selector memoization**: Use `select` option for derived data

## Debugging

Enable React Query DevTools in development:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<WarioQueryProvider {...}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</WarioQueryProvider>
```

## Backward Compatibility

This module **coexists with Redux**. Both systems can be used simultaneously during migration:

```tsx
// Use both providers during transition
<ReduxProvider store={store}>
  <WarioQueryProvider {...}>
    <App />
  </WarioQueryProvider>
</ReduxProvider>

// Components can use either:
const catalogFromRedux = useAppSelector(s => s.ws.catalog);
const { data: catalogFromQuery } = useCatalogQuery();
```

The existing Redux exports (`SocketIoSlice`, `SocketIoMiddleware`, etc.) remain unchanged.
