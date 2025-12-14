# Agent Guide - `wario-shared`

## 1. Identity & Purpose

`wario-shared` is the **Universal Backbone** of the monorepo.

- **Environment Agnostic**: Runs in Node.js (backend) and Browser (frontend).
- **Dependencies**: Zero heavy dependencies. No React, no NestJS. Pure TypeScript/Zod/date-fns.
- **Role**: Defines the "Language" of the domain (what is an Order? what is a Product?).

## 2. Tree-Shakable Entry Points

The package provides multiple entry points to avoid bundling unnecessary dependencies:

| Entry Point                 | Contents            | ESM Size                 | Use Case                                     |
| --------------------------- | ------------------- | ------------------------ | -------------------------------------------- |
| `@wcp/wario-shared`         | Everything          | 6KB + 238KB chunk        | Backend (needs DTOs with class-validator)    |
| `@wcp/wario-shared/logic`   | Types + utilities   | **2.87KB** + 118KB chunk | Frontend (needs functions like `WDateUtils`) |
| `@wcp/wario-shared/types`   | Interfaces + enums  | **561 bytes**            | Type-only imports                            |
| `@wcp/wario-shared/testing` | Mock data factories | 48KB                     | Tests                                        |

### Choosing the Right Entry Point

```typescript
// ✅ Type-only imports (smallest, no runtime code)
import type { IProduct, ICategory } from '@wcp/wario-shared/types';
import { FulfillmentType, DISABLE_REASON } from '@wcp/wario-shared/types';

// ✅ Types + utility functions (no class-validator/class-transformer)
import { WDateUtils, MoneyToDisplayString, WProductEquals } from '@wcp/wario-shared/logic';
import type { ICatalogSelectors } from '@wcp/wario-shared/logic';

// ✅ Backend DTOs with decorators (only in wario-backend)
import { CreateOrderRequestV2Dto, UpdateIProductRequestDto } from '@wcp/wario-shared';
```

> **Important**: Never import decorated DTO classes in frontend code. They pull in `class-validator` and `class-transformer` (~50KB+).

## 3. Technical Architecture

### Key Components

- **DTOs (`src/lib/dto`)**: Data Transfer Objects used in API requests/responses. e.g., `CreateOrderRequestV2Dto`.
- **Domain Objects (`src/lib/objects`)**: Rich classes/functions for business logic.
  - `WCPProduct`: The complex structure of a product with modifiers.
  - `WOrderInstance`: The order schema.
- **Utilities**: Formatting, Date calculations (`WDateUtils`), Number handling.

### Conventions

- **Validation**: Zod schemas are often co-located here to be used by both Backend (validation pipes) and Frontend (form resolvers).
- **No Side Effects**: Functions here should be pure.

## 4. Critical workflows

- **Cart Logic**: The logic for "Are these two pizzas identical?" (`WProductEquals`) lives here. This ensures the Frontend cart grouping matches the Backend's expectations.

### Visibility Logic (Display Path)

Controls what products appear in menus and ordering UIs. Located in `src/lib/objects/WMenu.ts`.

| Function                                             | Purpose                                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ComputeProductLevelVisibilityCheck`                 | Single source of truth for product visibility. Checks fulfillment, time, hide flags, and modifier availability. Returns `VisibleProductItem[]`. |
| `ComputeCategoryVisibilityMap`                       | Pre-computes visibility for entire category tree in one pass. Returns `{ products, populatedChildren }` maps.                                   |
| `ShowTemporarilyDisabledProducts`                    | Visibility filter for **menus**: shows enabled + time-disabled products (`reason !== DISABLED_BLANKET`).                                        |
| `ShowCurrentlyAvailableProducts`                     | Visibility filter for **ordering**: shows only enabled products (`reason === ENABLED`).                                                         |
| `GetMenuHideDisplayFlag` / `GetOrderHideDisplayFlag` | Returns `true` if product instance is hidden in that context.                                                                                   |

**Visibility Check Order**:

1. Fulfillment service disable check
2. Time-based availability (via `DisableDataCheck`)
3. Display flag (hide) check
4. Modifier-level visibility (`ComputePotentiallyVisible`)

### Validation Logic (Ordering Path)

Controls whether a specific product configuration can be ordered. Located in `src/lib/objects/WMenu.ts`.

| Function                                          | Purpose                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CanThisBeOrderedAtThisTimeAndFulfillmentCatalog` | Entry point for order validation. Checks if product is reachable + orderable.       |
| `FilterWCPProduct`                                | Checks product orderability via `FilterProductSelector`.                            |
| `FilterProductSelector`                           | Core validation: fulfillment disable, time availability, modifier option placement. |
| `FilterProductUsingCatalog`                       | Category-level filtering with availability and modifier checks.                     |

**Validation Check Order** (in `FilterProductSelector`):

1. Incomplete check (if `filterIncomplete` is true)
2. Fulfillment service disable
3. Time-based availability (`DisableDataCheck === ENABLED`)
4. Modifier option placement validity (left/right/whole enable checks)

### Key Types

```typescript
type PotentiallyVisibleDisableReasons = DISABLE_REASON; // ENABLED, DISABLED_BLANKET, DISABLED_AVAILABILITY, etc.

interface VisibleProductItem {
  product: IProduct;
  productInstance: IProductInstance;
  metadata: WProductMetadata;
}

interface CategoryVisibilityMap {
  products: Map<string, VisibleProductItem[]>;
  populatedChildren: Map<string, string[]>;
}
```

## 5. 2025 Schema Updates

**Important**: See `documentation/DTO_GUIDE.md` for comprehensive breaking changes documentation, including:

- Removed DTOs and fields
- New ordering patterns (ordering embedded in parent entities)
- Changed utility function signatures
- **Root category requirement**: A root category must exist at the top of the hierarchy. All categories are its descendants. Database init must create it.

Key files updated:

- `documentation/DTO_GUIDE.md` - Full breaking changes table
- `documentation/2025 schema updates.md` - Original change specification

## Documentation Workflow (Shared Type Library)

1. **Frame the task**: Capture a one-line problem statement, the primary consumer (backend validator, frontend form resolver, analytics), and the success metric (e.g., “Docs exist for all DTOs touched in PR #123; unknowns flagged; no broken links”).
2. **Inventory the surfaces**: List every affected artifact before writing:
   - Types/DTOs (`src/lib/types.ts`, `src/lib/dto/*`), domain objects (`src/lib/objects/*`), schemas (`src/lib/zod/*`), utilities, and any cross-package exports.
   - Note relationships (e.g., `IProductInstance` → `IProductInstanceDto` → `CreateOrderRequestV2Dto`).
3. **Lay down the skeleton** (per type/module) before filling details:
   - Overview: what it represents and where it is used.
   - Signature/shape: type alias/class name, required vs optional fields, default values.
   - Params/fields table: name, type, required?, allowed values/ranges, units, examples.
   - Behavior: validation rules, serialization notes (class-transformer/zod), versioning/compatibility, breaking-change risks.
   - Consumers: known callers (services, DTOs, frontend forms).
   - States: empty/loading/error/dirty where applicable.
   - Examples: happy path + edge case.
4. **Leave explicit stubs where unsure** so gaps are obvious:
   - `TODO: Confirm <method|field> behavior — not obvious from src/lib/objects/<file>.ts`
   - `??? Param <name> — clarify valid values/fallback (checked <file>:<line>, still unclear)`
   - `TODO @owner 2024-05-20: Document error handling for <call>`
   - Always log what you checked (file + line, ticket, PR) next to the stub.
5. **Research pass**: Read source/types/tests, run quick examples if needed, and resolve stubs. If unknowns remain, keep the stub and add the trace of what you inspected.
6. **Quality gate**: Verify every changed/added type has: overview, field table, behaviors, examples, consumer notes, and either resolved info or a stub. Check links, anchors, and code fences.
7. **Handoff**: Summarize completed coverage + remaining stubs (with owners/dates). Note any risky areas (breaking changes, serialization/validation differences between browser/node). Ship alongside the PR that introduced the type changes.
