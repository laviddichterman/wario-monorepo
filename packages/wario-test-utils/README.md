# Wario Test Utils

Shared React testing utilities for the Wario monorepo.

## Installation

This package is internal to the monorepo. Add it as a dependency:

```json
{
  "devDependencies": {
    "@wcp/wario-test-utils": "workspace:*"
  }
}
```

## Usage

### Custom Render with Providers

```typescript
import { renderWithProviders, createMockCatalog } from '@wcp/wario-test-utils';

test('displays product list', () => {
  const { getByText } = renderWithProviders(<ProductList />, {
    initialQueryData: {
      catalog: createMockCatalog(),
    },
  });

  expect(getByText('Plain Cheese Pizza')).toBeInTheDocument();
});
```

### Mock Query Client

```typescript
import { createMockQueryClient } from '@wcp/wario-test-utils';

const queryClient = createMockQueryClient();
queryClient.setQueryData(['catalog'], mockCatalog);
```

### Mock Data Generators

All generators from `@wcp/wario-shared/testing` are re-exported:

```typescript
import { createMockProduct, createMockCategory, createMockCatalog, MOCK_IDS } from '@wcp/wario-test-utils';
```
