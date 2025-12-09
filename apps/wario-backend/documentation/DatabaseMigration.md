# MongoDB to PostgreSQL Migration Strategy

This document outlines the architecture and strategy for migrating the Wario backend from MongoDB (Mongoose) to PostgreSQL (TypeORM).

## Core Philosophy

Our migration strategy distinguishes between **Schema Evolution (DDL)** and **Data Evolution (DML)** to maintain code quality and leverage existing domain logic (SCD2).

### 1. Hybrid Migration Approach

| Type             | Valid Handler              | Why?                                                                                                                                                       |
| :--------------- | :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema (DDL)** | **TypeORM Migrations**     | Best tool for creating tables, indices, and foreign keys. Handles raw SQL safely.                                                                          |
| **Data (DML)**   | **DatabaseManagerService** | Complex backfills (e.g., SCD2 versioning) require domain logic living in `NestJS Providers`. Injecting these into TypeORM CLI contexts is an anti-pattern. |

### 2. Startup Safety & Timing

To prevent race conditions where application modules access the database before tables exist:

- **Configuration**: We use `migrationsRun: true` in `app.module.ts`.
- **Effect**: The application boot process **blocks** at the TypeORM initialization step until all Schema Migrations have applied. This guarantees that by the time any Service is instantiated, the database schema is ready.

### 3. Initialization Logic (`DatabaseManagerService`)

When the application starts, it performs a safety check to determine if it is a **Fresh Install**, a **Migration Candidate**, or a **Corrupted State**.

#### Safety Guard (`checkSafeToInitialize`)

Since tables always exist (due to auto-migrations), we cannot check for table existence. Instead, we check for **existing data**.

- **Check**: `COUNT(*) > 0` on critical tables (`products`, `orders`).
- **Scenario A (Data exists, Version missing)**: **FATAL ERROR**. Manual intervention required.
- **Scenario B (No data)**: Safe to proceed with initialization or migration.

#### Legacy Migration (Mongo -> Postgres)

If the system detects a valid MongoDB connection with data, but an empty PostgreSQL database, it triggers the `MongooseToPostgresMigrator`.

- This service maps Mongoose Documents -> TypeORM Entities.
- Handles standard columns (`name`, `price`) and special SCD2 columns (`rowId`, `validFrom`, `validTo`).
- **Included Collections**: `orders`, `products`, `settings`, `printing`, `fulfillments`, and more.

## Developer Workflow

### Creating Schema Changes

1. **Modify Entity**: Update the `.entity.ts` file in `src/entities`.
2. **Generate Migration**:
   ```bash
   pnpm migration:generate src/migrations/NameOfChange
   ```
3. **Review**: Check the generated SQL file.
4. **Apply**: Restart the server (auto-runs) or use `pnpm migration:run`.

### Creating Data Backfills

1. **Modify `DatabaseManagerService`**: Add a new step to the `POSTGRES_MIGRATIONS` dictionary.
   ```typescript
   '1.2.0': async () => {
     await this.productRepository.updateAll({ ... }); // Use Service methods!
   }
   ```
2. **Testing**: Add a specific test case in `migration.e2e-spec.ts`.

## Testing

We have a dedicated E2E test suite for migration logic.

- **File**: `test/migration.e2e-spec.ts`
- **Behavior**:
  1. Drops/Seeds a test MongoDB instance.
  2. Starts the Backend (triggering migration).
  3. Verifies data integrity in PostgreSQL.
- **Run Manually**:
  See `walkthrough.md` or `test/setup-env.ts` for instructions on setting up the local test environment.
