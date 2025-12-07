---
description: How to write properly typed unit tests for the backend
---

# Unit Testing Workflow

## Pre-Test Checklist

Before writing any tests:

1. **Verify mock infrastructure exists** for the types you'll be testing
   - Check `apps/wario-backend/test/utils/` for existing mock generators
   - Check `packages/wario-shared/testing` for domain type mocks (IProduct, ICategory, etc.)

2. **If mocks don't exist**, create them first:
   - Domain types → `packages/wario-shared/tests/mocks.ts`
   - Backend-specific (Orders, Mongoose docs) → `apps/wario-backend/test/utils/`

---

## Writing Tests

### 1. Mock Service Methods

Use `jest.Mock` casting to avoid Mongoose document type inference issues:

```typescript
(mockCatalogService.CreateModifierType as jest.Mock).mockResolvedValue(mockValue);
```

### 2. Use Type Assertion Helpers

Verify returned values satisfy interfaces:

```typescript
function assertIsOptionType(value: unknown): asserts value is IOptionType {
  const optionType = value as IOptionType;
  expect(optionType).toHaveProperty('id');
  expect(optionType).toHaveProperty('name');
  expect(optionType).toHaveProperty('displayFlags');
}

// In test
const result = await controller.CreateModifierType(body);
assertIsOptionType(result);
expect(result.id).toBe('expected-id');
```

### 3. ESLint Disables

Only use targeted disables for known patterns:

```typescript
/* eslint-disable @typescript-eslint/unbound-method */ // For Jest mock assertions
```

**Do NOT use:**

- `@ts-ignore` or `@ts-expect-error`
- `any` type to bypass issues
- Blanket `eslint-disable` without specific rules

---

## Verification

// turbo

1. Run tests:

```bash
cd apps/wario-backend && pnpm test
```

2. Run lint:

```bash
cd apps/wario-backend && pnpm lint
```

Both must pass with 0 errors before completing the task.

---

## Mock Generators Reference

| Type           | Location                 | Generator                    |
| -------------- | ------------------------ | ---------------------------- |
| IProduct       | wario-shared/testing     | `createMockProduct()`        |
| ICategory      | wario-shared/testing     | `createMockCategory()`       |
| IOptionType    | wario-shared/testing     | `createMockOptionType()`     |
| IOption        | wario-shared/testing     | `createMockOption()`         |
| WOrderInstance | wario-backend/test/utils | `createMockWOrderInstance()` |
| Catalog setup  | wario-backend/test/utils | `setupMockCatalog()`         |
