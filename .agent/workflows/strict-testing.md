---
description: Mandatory workflow for writing tests with strict type safety and mock data standards
---

# Strict Testing Standards

Follow this workflow WHENEVER writing or refactoring tests (E2E, Unit, or Integration).

## 1. Mock Data Audit

**Before writing `it()` blocks:**

- [ ] Identify all entities/DTOs needed for the test.
- [ ] Search `test/utils` and `@wcp/wario-shared` for existing factories (e.g., `createMockProduct`, `createMockOrder`).
- [ ] **CRITICAL**: If a factory does not exist, **CREATE IT**.
  - **Do NOT** manually craft object literals in the test file.
  - **Do NOT** use `as any` to bypass missing properties.
  - Add the new factory to `test/utils/mock-entities.ts` or `packages/wario-shared`.

## 2. Legacy Data Typing

**When testing Migrations or Legacy Code:**

- [ ] **NEVER** cast legacy data to `any` (e.g., `doc as any`).
- [ ] Define a `Legacy{Entity}Shape` interface in the test file or `src/legacy-types`.
- [ ] Use intersection types for mixed states: `type SeedData = Partial<ProductEntity> & { legacyField: boolean };`.

## 3. Implementation Rules

- [ ] **No `as any`**: Grep the test file for `as any`. If found, refactor to use proper Partial<T> or specific Mock types.
- [ ] **Strict Inference**: Let TypeScript infer types from your properly typed factories.
  - _Bad_: `const p: any = createMockProduct(...)`
  - _Good_: `const p = createMockProduct(...)`

## 4. Verification

- [ ] Run `eslint` on the specific test file: `pnpm eslint path/to/test.spec.ts`.

## 5. Coding Patterns

### Null Checks & Assertions

**Goal**: Fail fast and visibly. Do not rely on silent failures or TypeScript non-null assertions (`!`).

❌ **BAD**:

```typescript
afterAll(async () => {
  // Silent failure: if app is undefined, nothing happens, leaving resources potentialy open
  if (app) await app.close();
});

it('should work', () => {
  // Dangerous: runtime error if service is undefined
  service!.doWait();
});
```

✅ **GOOD**:

```typescript
afterAll(async () => {
  // Fails explicitly if setup failed
  if (!app) throw new Error('App was not initialized');
  await app.close();
});

it('should work', () => {
  // Type narrowing with explicit guard
  if (!service) throw new Error('Service not available');
  service.doWait();
});
```

### Destructuring & Unused Variables

**Goal**: Explicitly mark variables as ignored to satisfy linter and readers.

❌ **BAD**:

```typescript
// Linter error: 'id' is defined but never used
const { id, ...data } = entity;
```

✅ **GOOD**:

```typescript
// Clear intent: we are modifying 'entity' by removing 'id'
const { id: _id, ...data } = entity;
```

### Class Spreading

**Goal**: Avoid "Unsafe spread of a generic interface" or class instance warnings.

❌ **BAD**:

```typescript
const instance = new ProductEntity();
// Warning: Spreading a class instance might miss prototype methods or carry hidden internal state
const plain = { ...instance };
```

✅ **GOOD**:

```typescript
const instance = new ProductEntity();
// Safe: Cast to the data interface before spreading
const plain = { ...(instance as IProduct) };
```

### Strict Type Safety

**Goal**: Let type system work for you.

❌ **BAD**:

```typescript
// Lazy casting hides missing properties
const mock: ProductEntity = { id: '1' } as any;
```

✅ **GOOD**:

```typescript
// Uses factory with validated shape
const mock = createMockProductEntity({ id: '1' });
```
