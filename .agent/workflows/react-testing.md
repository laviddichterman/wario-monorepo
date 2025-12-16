---
description: How to write React component and hook tests using Vitest
---

# React Testing Workflow

Follow this workflow when writing unit tests for React components, hooks, or stores.

## Pre-Test Checklist

Before writing any `it()` blocks:

1. **Verify test infrastructure exists** for the package
   - [ ] Check that `vitest.config.ts` exists in the package
   - [ ] Check that `vitest.setup.ts` exists and imports `@testing-library/jest-dom/vitest`
   - [ ] Verify `@wcp/wario-test-utils` is in `devDependencies`

2. **Verify mock infrastructure exists** for the types you'll need
   - [ ] Check `@wcp/wario-test-utils` for existing mock generators
   - [ ] Check `@wcp/wario-shared/testing` for domain type mocks

3. **If mocks don't exist**, create them first:
   - Domain types (IProduct, ICategory, etc.) → `packages/wario-shared/testing`
   - React-specific mocks → `packages/wario-test-utils/src/mocks/`

---

## Writing Tests

### File Naming Convention

Place tests next to the component they test:

```
src/components/
├── MyComponent.tsx
├── MyComponent.test.tsx    # ← Test file
└── index.ts
```

Or in a `__tests__` folder:

```
src/components/
├── __tests__/
│   └── MyComponent.test.tsx
├── MyComponent.tsx
└── index.ts
```

### Test Structure

```typescript
import { screen } from '@testing-library/react';
import {
  renderWithProviders,
  createMockCatalog,
} from '@wcp/wario-test-utils';

import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders the component title', () => {
    renderWithProviders(<MyComponent />);

    expect(screen.getByText('Expected Title')).toBeInTheDocument();
  });
});
```

---

## Component Testing Patterns

### 1. Testing with Query Data

Pre-populate the query cache for components that depend on TanStack Query:

```typescript
import { renderWithProviders, createMockCatalog } from '@wcp/wario-test-utils';

it('displays products from catalog', () => {
  const mockCatalog = createMockCatalog();

  renderWithProviders(<ProductList />, {
    initialQueryData: {
      catalog: mockCatalog,
    },
  });

  expect(screen.getByText('Plain Cheese Pizza')).toBeInTheDocument();
});
```

### 2. Testing User Interactions

Use `@testing-library/user-event` for realistic interactions:

```typescript
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@wcp/wario-test-utils';

it('handles button click', async () => {
  const user = userEvent.setup();

  renderWithProviders(<MyButton onClick={vi.fn()} />);

  await user.click(screen.getByRole('button'));

  // Assert expected behavior
});
```

### 3. Testing with Context Providers

For components that need specific context values:

```typescript
import { renderWithProviders, createMockSocketContext } from '@wcp/wario-test-utils';

it('shows connected status', () => {
  const mockSocket = createMockSocketContext({ status: 'connected' });

  renderWithProviders(
    <SocketContext.Provider value={mockSocket}>
      <ConnectionStatus />
    </SocketContext.Provider>
  );

  expect(screen.getByText('Connected')).toBeInTheDocument();
});
```

---

## Hook Testing Patterns

Use `@testing-library/react` `renderHook` for testing custom hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { createMockQueryClientProvider } from '@wcp/wario-test-utils';

describe('useCatalogQuery', () => {
  it('returns catalog data', async () => {
    const wrapper = createMockQueryClientProvider();

    const { result } = renderHook(() => useCatalogQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });
});
```

---

## Jotai Atom Testing (wario-pos)

For testing Jotai atoms in `wario-pos`:

```typescript
import { Provider, useAtomValue, useSetAtom } from 'jotai';
import { renderHook, act } from '@testing-library/react';

import { myAtom } from './atoms';

describe('myAtom', () => {
  it('updates state correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider>{children}</Provider>
    );

    const { result: getter } = renderHook(() => useAtomValue(myAtom), { wrapper });
    const { result: setter } = renderHook(() => useSetAtom(myAtom), { wrapper });

    act(() => {
      setter.current('new value');
    });

    expect(getter.current).toBe('new value');
  });
});
```

---

## Zustand Store Testing (wario-fe-order)

For testing Zustand stores:

```typescript
import { act } from '@testing-library/react';

import { useCartStore } from './useCartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useCartStore.getState().clearCart();
  });

  it('adds item to cart', () => {
    const { addToCart, items } = useCartStore.getState();

    act(() => {
      addToCart(mockProduct);
    });

    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
```

---

## Verification

// turbo

Run tests for the specific package:

```bash
cd packages/wario-ux-shared && pnpm test
```

Or from root for all React tests:

```bash
pnpm test:react
```

Run in watch mode during development:

```bash
cd packages/wario-ux-shared && pnpm test:watch
```

---

## Common Gotchas

### 1. Missing jest-dom matchers

If `toBeInTheDocument()` is not recognized, ensure `vitest.setup.ts` imports:

```typescript
import '@testing-library/jest-dom/vitest';
```

### 2. QueryClient not cleaned up

Create a fresh QueryClient for each test:

```typescript
// Good: uses renderWithProviders which creates fresh client
renderWithProviders(<MyComponent />);

// Bad: reusing client across tests
const sharedClient = createMockQueryClient();
```

### 3. Async state updates

Always use `waitFor` or `findBy*` for async updates:

```typescript
// Good
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());

// Also good
expect(await screen.findByText('Loaded')).toBeInTheDocument();

// Bad - might fail due to timing
expect(screen.getByText('Loaded')).toBeInTheDocument();
```

---

## Mock Generators Reference

| Type           | Location             | Generator                   |
| -------------- | -------------------- | --------------------------- |
| IProduct       | wario-shared/testing | `createMockProduct()`       |
| ICategory      | wario-shared/testing | `createMockCategory()`      |
| IOptionType    | wario-shared/testing | `createMockOptionType()`    |
| IOption        | wario-shared/testing | `createMockOption()`        |
| Full Catalog   | wario-shared/testing | `createMockCatalog()`       |
| QueryClient    | wario-test-utils     | `createMockQueryClient()`   |
| Socket Context | wario-test-utils     | `createMockSocketContext()` |
