# Agent Guide - `wario-backend`

## 1. Identity & Purpose

`wario-backend` is the **central nervous system** of the Wario platform. It is a NestJS application responsible for:

- **Order Management**: The lifecycle of an order from creation (Draft) to completion (Completed/Canceled).
- **Hardening & Validation**: Ensuring that data entering the system (from POS or web) is valid before it hits the database.
- **Integrations**: Managing the "Bridge" to Square for payments and catalog synchronization.
- **Real-time Updates**: Broadcasting socket events to connected clients (Kitchen Display, POS).

## 2. Technical Architecture

### Core Framework

- **NestJS**: Standard modular architecture.
- **Database**: MongoDB via `mongoose`.
- **Logging**: `nestjs-pino`. **Strict Rule**: _Never_ use `console.log`. Always inject `PinoLogger`.

### Directory Structure (`src/`)

- `app.module.ts`: Root module.
- `config/`: **CRITICAL**. Despite the name, this contains the **Domain Services** (Business Logic).
  - `order-manager/`: Core order logic (state machine, transitions).
  - `square/`: Wrappers for Square API interaction.
  - `catalog-provider/`: Source of truth for menu items.
- `controllers/`: REST endpoints.
  - `order/`: Endpoints for manipulating orders (`POST /api/v1/order`).
- `models/`: Mongoose Schemas & DTOs.
  - `orders/`: `WOrderInstance` schema.
- `auth/`: JWT strategies and Guards.

### Key Design Patterns

#### 1. The Locking Mechanism

**File:** `src/decorators/lock-order.decorator.ts`, `src/interceptors/order-lock.interceptor.ts`
**Concept:** To prevent race conditions (e.g., two POS tablets modifying the same order), checking out or modifying an order requires a **Lock**.

- **Usage:** Controllers use `@LockOrder()` which triggers the `OrderLockInterceptor`.
- **Flow:** Request -> Interceptor acquires DB lock on OrderID -> Controller Action -> Response -> Lock released.
- **Gotcha:** If you write a new mutation endpoint for an Order, you **MUST** use this mechanism.

#### 2. Scope-Based Authorization

**File:** `src/auth/decorators/scopes.decorator.ts`
**Concept:** Endpoints are protected by OAuth scopes via `@Scopes('scope:name')`.

- **Common Scopes:** `read:order`, `write:order`, `cancel:order`.

#### 3. Square Service Wrapper

**File:** `src/config/square/square.service.ts`
**Concept:** A robust wrapper around the official Square SDK.

- **Features:**
  - **Exponential Backoff:** Built-in retry logic for 429/500 errors (`SquareCallFxnWrapper`).
  - **BigInt Mapping:** Converts Wario's `number`-based money to Square's `BigInt` money.
- **Rule:** **Always** use this service for Square calls; never instantiate the Square Client directly.

## 3. Critical Workflows

### Order Lifecycle

1.  **Creation**: `POST /api/v1/order`. Validates payload against `CreateOrderRequestV2Dto`.
2.  **Modifications**: Can only happen if Order is open.
3.  **Payment**: Handled via `PayOrder` in `SquareService`. Linking a Square Payment ID to the Wario Order.
4.  **Completion**: Moving an order to 'COMPLETED' triggers receipt generation and potentially loyalty points (if implemented).

### Catalog Sync

The `CatalogProvider` service acts as the cache/proxy for Square's Catalog. Wario does _not_ own the master catalog; Square does. We sync down from it.

## 4. Developer Guide

### Running Locally

```bash
# Start in dev mode with watch
pnpm output backend:start:dev
```

### Validating Changes

Run the test suite before submitting:

```bash
pnpm backend:test
```

## Schema Migration

The application handles schema migrations on startup via `DatabaseManagerService`.

### PostgreSQL Migrations

Migrations are defined in `POSTGRES_MIGRATIONS` map within `DatabaseManagerService`.
Each migration is a function that receives a `DataSource` and performs necessary SQL or Repository operations.

```typescript
'1.0.1': [{ major: 1, minor: 0, patch: 2 }, async (dataSource) => {
  await dataSource.query(`ALTER TABLE product ADD COLUMN dietary_info JSONB DEFAULT NULL`);
}]
```

The service checks the current DB version against `package.json` and runs pending migrations sequentially.

### Initialization & Data Migration

The `DatabaseManagerService` handles the initial setup of the PostgreSQL database:

1.  **Fresh Install Detection**: If the `DBVersion` table is missing, it assumes a fresh install.
2.  **Safety Guard**: It explicitly checks that critical tables (`settings`, `orders`, `products`) do not exist. If they do, it aborts to prevent data loss.
3.  **Schema Sync**: Creates the database schema (tables) using `synchronize(false)`.
4.  **Auto-Migration from Mongoose**: If connected to MongoDB and legacy data is found (`Settings` collection not empty), it triggers the **MongooseToPostgresMigrator** to move data to Postgres.
5.  **Seeding Defaults**: If no legacy data is found, it seeds default `Settings` and a default `PrinterGroup` for a clean start.

### Legacy Support

`LEGACY_MONGOOSE_MIGRATIONS` exists for historical support but is **frozen**. All new schema changes should target PostgreSQL.

### Testing

- **Unit Tests:** `*.spec.ts` files next to the source.
- **E2E Tests:** Located in `test/`. Run via `pnpm output backend:test:e2e`.

### Testing Norms

**STRICT ADHERENCE REQUIRED.** See `.agent/workflows/strict-testing.md` for the full workflow.

1.  **Mock Data**:
    - **NEVER** usage object literals for entities.
    - **ALWAYS** usage factory functions (e.g. `createMockProduct`, `createMockSettingsEntity`).
    - If a factory is missing, create it in `test/utils/mock-entities.ts`.

2.  **Type Safety**:
    - **NEVER** use `as any`. Fix the type definition or the mock data.
    - **Legacy Data**: Define proper types for legacy shapes (e.g. `type LegacySettings = Partial<SettingsEntity> & { extra: boolean }`).

3.  **Patterns**:
    - **Null Checks**: Throw errors, don't just return.
      - `if (!app) throw new Error('App undefined'); await app.close();`
    - **Destructuring**: Underscore unused variables.
      - `const { id: _id, ...rest } = data;`
    - **Class Spreading**: Cast to Interface to avoid "unsafe spread".
      - `const plain = { ...(instance as IProduct) };`

### Common Tasks

- **Adding a new API Endpoint**:
  1.  Create controller method in `src/controllers/foo/foo.controller.ts`.
  2.  Add DTO in `src/dtos/`.
  3.  Implement logic in `src/config/foo/foo.service.ts`.
  4.  Add `@Scopes()` and `@UseGuards(JwtAuthGuard)`.

- **Modifying Order Schema**:
  1.  Edit `src/models/orders/WOrderInstance.ts`.
  2.  **CRITICAL**: Update the shared DTO in `packages/wario-shared` first to keep frontend in sync.

## 5. Gotchas & Warnings

> [!WARNING]
> **Do not bypass `OrderManager`**. Directly modifying the `OrderModel` (Mongoose model) in a controller skips validation and locking. Always loop through `OrderManagerService`.

> [!CAUTION]
> **Square Rate Limits**. The `SquareService` handles retries, but be mindful of batch sizes when syncing catalog items.

## 6. Configuration & Initialization Patterns

### AppConfigService

**File:** `src/config/app-config.service.ts`
**Module:** `src/config/app-configuration.module.ts` (Global)

The **single source of truth** for environment variables. Never use `process.env` directly in services. The service is provided by `AppConfigurationModule` to avoid circular dependencies with `ConfigModule`.

```typescript
// ❌ Bad - scattered env reads
const chunkSize = parseInt(process.env.WARIO_SQUARE_BATCH_CHUNK_SIZE || '25');

// ✅ Good - use AppConfigService
constructor(private appConfig: AppConfigService) {}
const chunkSize = this.appConfig.squareBatchChunkSize;
```

### MigrationFlagsService

**File:** `src/config/migration-flags.service.ts`

Holds **mutable runtime flags** that can be set by database migrations. Decouples `DatabaseManagerService` from other services.

- `requireSquareRebuild` - Triggers full Square catalog rebuild
- `obliterateModifiersOnLoad` - Clears and re-syncs modifiers

> [!IMPORTANT]
> **Circular Dependency Pattern**: If service A needs to set state in service B, but B depends on A, use `MigrationFlagsService` as a shared state holder instead of `forwardRef`.

### Avoiding Circular Dependencies

When you encounter `UnknownDependenciesException` or initialization order issues:

1. **Check if it's just for setting flags** - Use `MigrationFlagsService`
2. **Check if it's for reading config** - Use `AppConfigService`
3. **Only use `forwardRef`** for true bidirectional runtime calls between services
4. **Consider if the dependency is even needed** - Often services are injected but never used

## 7. PostgreSQL Entities (TypeORM)

### Overview

The backend is migrating from MongoDB to PostgreSQL. TypeORM entities are defined in `src/entities/` and coexist with Mongoose schemas during the transition.

**Feature Flag:** `USE_POSTGRES` env var controls whether TypeORM connects.

### Directory Structure

```
src/entities/
├── base/
│   ├── temporal.entity.ts    # Abstract base for SCD2 versioning
│   └── audit-log.entity.ts   # Generic change tracking
├── catalog/
│   ├── category.entity.ts
│   ├── option-type.entity.ts
│   ├── option.entity.ts
│   ├── product.entity.ts
│   ├── product-instance.entity.ts
│   ├── catalog-version.entity.ts
│   ├── product-instance-function.entity.ts
│   └── order-instance-function.entity.ts
├── order/
│   ├── order.entity.ts
│   └── order-history.entity.ts
├── settings/
│   ├── db-version.entity.ts
│   ├── fulfillment.entity.ts
│   ├── key-value.entity.ts
│   ├── printer-group.entity.ts  # Temporal (extends TemporalEntity)
│   ├── seating-resource.entity.ts
│   └── settings.entity.ts
└── index.ts
```

### Temporal Versioning (SCD2)

Catalog entities and PrinterGroup extend `TemporalEntity` for point-in-time queries:

**Temporal entities:** `CategoryEntity`, `OptionTypeEntity`, `OptionEntity`, `ProductEntity`, `ProductInstanceEntity`, `ProductInstanceFunctionEntity`, `OrderInstanceFunctionEntity`, `PrinterGroupEntity`

```typescript
abstract class TemporalEntity {
  rowId: string; // PostgreSQL PK (uuid, generated)
  id: string; // Logical entity ID (preserved from MongoDB _id)
  validFrom: Date; // When this version became active
  validTo: Date | null; // null = current version
  createdAt: Date;
}
```

**Query Pattern:**

```sql
WHERE id = ? AND validFrom <= ? AND (validTo IS NULL OR validTo > ?)
```

### Interface Parity

All entities implement their `wario-shared` interfaces:

| Entity                          | Implements                 |
| ------------------------------- | -------------------------- |
| `CategoryEntity`                | `ICategory`                |
| `OptionTypeEntity`              | `IOptionType`              |
| `OptionEntity`                  | `IOption`                  |
| `ProductEntity`                 | `IProduct`                 |
| `ProductInstanceEntity`         | `IProductInstance`         |
| `FulfillmentEntity`             | `FulfillmentConfig`        |
| `SettingsEntity`                | `IWSettings`               |
| `OrderEntity`                   | `WOrderInstance`           |
| `ProductInstanceFunctionEntity` | `IProductInstanceFunction` |
| `OrderInstanceFunctionEntity`   | `OrderInstanceFunction`    |

### Discriminated Unions as JSONB

Complex expression types (`IAbstractExpression`, etc.) are stored as JSONB columns since they're recursive structures evaluated at runtime, not queried by structure.

### CLI Migrations

TypeORM configuration is centralized in `src/config/typeorm-config.helper.ts` to ensure consistency between CLI and runtime. See `documentation/DatabaseMigration.md` for the full workflow.

```bash
# Generate migration from entity changes
cd apps/wario-backend
npx typeorm migration:generate -d ormconfig.ts src/migrations/MigrationName

# Run migrations
npx typeorm migration:run -d ormconfig.ts
```

> [!WARNING]
> **Circular FK Constraints**: The `DeferCircularFKConstraints` migration drops FK constraints for data migration. These are reinstated by `ReinstateCircularFKConstraints`. Do not manually add/remove these constraints.

## 8. Repository Layer

### Overview

The repository layer abstracts database access, enabling dual-database operation during migration. Factory providers switch implementations based on `USE_POSTGRES`.

### Directory Structure

```
src/repositories/
├── interfaces/           # Database-agnostic contracts
│   ├── category.repository.interface.ts
│   ├── option.repository.interface.ts
│   └── ... (10 total)
├── mongoose/             # Wrappers around Mongoose models
│   ├── category.mongoose.repository.ts
│   └── ...
├── typeorm/              # TypeORM implementations (SCD2)
│   ├── category.typeorm.repository.ts
│   └── ...
└── repository.module.ts  # Factory providers
```

### Usage Pattern

```typescript
// In a service:
constructor(
  @Inject(CATEGORY_REPOSITORY)
  private readonly categoryRepo: ICategoryRepository,
) {}

// Methods:
const cat = await this.categoryRepo.findById(id);
const all = await this.categoryRepo.findAll();
await this.categoryRepo.save(category);
```

### Interface Tokens

Use Symbol tokens for injection (not class names):

| Token                                  | Interface                            |
| -------------------------------------- | ------------------------------------ |
| `CATEGORY_REPOSITORY`                  | `ICategoryRepository`                |
| `DB_VERSION_REPOSITORY`                | `IDBVersionRepository`               |
| `FULFILLMENT_REPOSITORY`               | `IFulfillmentRepository`             |
| `KEY_VALUE_REPOSITORY`                 | `IKeyValueRepository`                |
| `OPTION_TYPE_REPOSITORY`               | `IOptionTypeRepository`              |
| `OPTION_REPOSITORY`                    | `IOptionRepository`                  |
| `ORDER_INSTANCE_FUNCTION_REPOSITORY`   | `IOrderInstanceFunctionRepository`   |
| `ORDER_REPOSITORY`                     | `IOrderRepository`                   |
| `PRINTER_GROUP_REPOSITORY`             | `IPrinterGroupRepository`            |
| `PRODUCT_REPOSITORY`                   | `IProductRepository`                 |
| `PRODUCT_INSTANCE_REPOSITORY`          | `IProductInstanceRepository`         |
| `PRODUCT_INSTANCE_FUNCTION_REPOSITORY` | `IProductInstanceFunctionRepository` |
| `SEATING_RESOURCE_REPOSITORY`          | `ISeatingResourceRepository`         |
| `SETTINGS_REPOSITORY`                  | `ISettingsRepository`                |

### TypeORM SCD2 Pattern

Catalog repos use soft-delete for temporal versioning:

```typescript
// Update closes old version, creates new
async save(item) {
  if (item.id) {
    await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
  }
  return this.repo.save({ ...item, validFrom: now, validTo: null });
}

// Delete just closes the current version
async delete(id) {
  await this.repo.update({ id, validTo: IsNull() }, { validTo: now });
}
```

### Catalog Version Locking

> [!IMPORTANT]
> Catalog CRUD operations are **not atomic** by default. Without locking, an order created mid-update may see an inconsistent catalog state.

#### The Problem

```
T+0ms: updateProduct() closes old version (validTo = T)
T+1ms: ORDER CREATED at T+1ms → sees NO valid product!
T+2ms: updateProduct() inserts new version (validFrom = T+2ms)
```

#### Solution: Transactional Locking

**For Catalog CRUD** — Acquire exclusive lock:

```typescript
async updateProduct(id: string, data: Partial<Product>) {
  return this.dataSource.transaction(async (manager) => {
    // 1. Acquire exclusive lock on current catalog version
    await manager.query(
      `SELECT * FROM catalog_versions WHERE id = $1 FOR UPDATE`,
      [currentVersionId]
    );

    // 2. All operations use same timestamp
    const now = new Date();

    // 3. Close old, insert new (atomic within transaction)
    await manager.update(ProductEntity, { id, validTo: IsNull() }, { validTo: now });
    await manager.insert(ProductEntity, { ...data, validFrom: now, validTo: null });
  });
}
```

**For Order Creation** — Acquire shared lock:

```typescript
async createOrder(order: CreateOrderDto) {
  return this.dataSource.transaction(async (manager) => {
    // 1. Shared lock allows concurrent reads, blocks writes
    const [catalogVersion] = await manager.query(
      `SELECT * FROM catalog_versions ORDER BY effective_at DESC LIMIT 1 FOR SHARE`
    );

    // 2. Query catalog at this version's timestamp
    const products = await manager.find(ProductEntity, {
      where: {
        validFrom: LessThanOrEqual(catalogVersion.effectiveAt),
        validTo: IsNull()
      }
    });

    // 3. Create order with catalog version reference
    await manager.insert(OrderEntity, {
      ...order,
      catalogVersionId: catalogVersion.id
    });
  });
}
```

#### Lock Compatibility Matrix

| Operation      | Lock Type                | Blocks                     |
| -------------- | ------------------------ | -------------------------- |
| Catalog CRUD   | `FOR UPDATE` (exclusive) | Other CRUD, order creation |
| Order Creation | `FOR SHARE` (shared)     | Catalog CRUD only          |
| Order Read     | None                     | Nothing                    |

This ensures orders always see a **consistent catalog snapshot**.
