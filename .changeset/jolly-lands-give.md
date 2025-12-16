---
'@wcp/wario-backend': patch
---

# 2025 Schema Migration & Mongoose Updates

- **Database Migration**: Implemented `MongooseToNewMigrator` to transition data to the 2025 schema structure. This is an additive "Phase 1" migration.
  - Inverts Category tree: Adds `children[]` and `products[]` to Categories; deprecates `parent_id` and `ordinal`.
  - Orders Options: Adds ordered `options[]` to OptionTypes; deprecates `ordinal` on Options.
  - Orders Product Instances: Adds ordered `instances[]` to Products; deprecates `baseProductId`.
  - Flattens Settings: Moves keys from `settings.config` to top-level fields.
- **Boot Sequence**: `DatabaseManagerService` now executes this migration automatically for legacy Mongoose databases.
- **Refactoring**: Updated catalog provider functions and controllers to support the new schema structure.
