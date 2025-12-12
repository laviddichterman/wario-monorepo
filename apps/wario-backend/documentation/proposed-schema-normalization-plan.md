# Catalog Schema Normalization Plan

> **Status**: Proposed, NOT APPROVED and might conflict with other plans
> **Created**: 2025-12-12  
> **Related**: Catalog Provider refactoring, TypeORM migration

## Overview

This document outlines a plan to normalize the catalog schema in PostgreSQL, replacing embedded ID arrays with proper foreign key relationships. This change affects only the **database layer**—the `wario-shared` DTOs and frontend remain unchanged.

### Current State (Denormalized)

| Entity             | Field       | Current Type              |
| ------------------ | ----------- | ------------------------- |
| `ProductEntity`    | `instances` | `string[]` (array of IDs) |
| `OptionTypeEntity` | `options`   | `string[]` (array of IDs) |
| `CategoryEntity`   | `products`  | `string[]` (array of IDs) |
| `CategoryEntity`   | `children`  | `string[]` (array of IDs) |

### Target State (Normalized)

- Foreign keys on child entities with `ordinal` columns for ordering
- Join tables for many-to-many relationships
- Repository layer assembles arrays for API responses

---

## Benefits of Normalization

| Benefit                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| **Referential Integrity** | DB enforces FK constraints; orphaned IDs impossible              |
| **Index Efficiency**      | Standard B-tree indexes on FK columns                            |
| **Simpler Updates**       | No array manipulation; standard INSERT/UPDATE/DELETE             |
| **Query Flexibility**     | Easy reverse lookups (e.g., "which products use this instance?") |
| **Cache Efficiency**      | Smaller rows = more rows per page = better cache hit rate        |

### Trade-offs

| Trade-off              | Mitigation                             |
| ---------------------- | -------------------------------------- |
| JOIN overhead on reads | Indexes + application-layer caching    |
| More complex queries   | TypeORM relations handle this          |
| Migration complexity   | Phased approach with dual-write period |

---

## Schema Changes

### 1. ProductInstance ← Product (One-to-Many)

```sql
ALTER TABLE product_instances
  ADD COLUMN "productId" uuid NOT NULL REFERENCES products(id),
  ADD COLUMN ordinal int NOT NULL DEFAULT 0;

CREATE INDEX idx_product_instances_product_id ON product_instances("productId");
```

```typescript
// product-instance.entity.ts
@ManyToOne(() => ProductEntity, { nullable: false })
@JoinColumn({ name: 'productId' })
product!: ProductEntity;

@Column('int')
ordinal!: number;
```

**Remove from ProductEntity:**

```diff
- @Column('text', { array: true, default: [] })
- instances!: string[];
```

---

### 2. Option ← OptionType (One-to-Many)

```sql
ALTER TABLE options
  ADD COLUMN "optionTypeId" uuid NOT NULL REFERENCES option_types(id),
  ADD COLUMN ordinal int NOT NULL DEFAULT 0;

CREATE INDEX idx_options_option_type_id ON options("optionTypeId");
```

```typescript
// option.entity.ts
@ManyToOne(() => OptionTypeEntity, { nullable: false })
@JoinColumn({ name: 'optionTypeId' })
optionType!: OptionTypeEntity;

@Column('int')
ordinal!: number;
```

**Remove from OptionTypeEntity:**

```diff
- @Column('text', { array: true, default: [] })
- options!: string[];
```

---

### 3. Category ↔ Product (Many-to-Many with Ordering)

A product can appear in multiple categories, and categories have ordered product lists.

```sql
CREATE TABLE category_products (
  "categoryId" uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  "productId" uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ordinal int NOT NULL DEFAULT 0,
  PRIMARY KEY ("categoryId", "productId")
);

CREATE INDEX idx_category_products_category ON category_products("categoryId");
CREATE INDEX idx_category_products_product ON category_products("productId");
```

```typescript
// category-product.entity.ts
@Entity('category_products')
export class CategoryProductEntity {
  @PrimaryColumn('uuid')
  categoryId!: string;

  @PrimaryColumn('uuid')
  productId!: string;

  @Column('int')
  ordinal!: number;

  @ManyToOne(() => CategoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: CategoryEntity;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;
}
```

**Remove from CategoryEntity:**

```diff
- @Column('text', { array: true, default: [] })
- products!: string[];
```

---

### 4. Category ↔ Category (Self-Referencing Children)

```sql
CREATE TABLE category_children (
  "parentId" uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  "childId" uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  ordinal int NOT NULL DEFAULT 0,
  PRIMARY KEY ("parentId", "childId")
);
```

**Alternative**: Keep `children: string[]` if:

- Category hierarchy is shallow (2-3 levels)
- Children are rarely queried in reverse
- Simplicity is preferred

---

## Repository Layer Changes

### Assembly Pattern

Repositories must transform normalized data → DTO shape:

```typescript
// product.typeorm.repository.ts
async findById(id: string): Promise<IProduct | null> {
  const entity = await this.repo.findOne({ where: { id } });
  if (!entity) return null;

  const instances = await this.dataSource
    .getRepository(ProductInstanceEntity)
    .find({
      where: { product: { id } },
      order: { ordinal: 'ASC' },
      select: ['id'],
    });

  return {
    ...this.toDto(entity),
    instances: instances.map(i => i.id),
  };
}
```

### Bulk Loading for Catalog

```typescript
async getFullCatalog(): Promise<{ products: IProduct[], instances: IProductInstance[], ... }> {
  // Single query with JOINs
  const products = await this.dataSource.query(`
    SELECT
      p.*,
      COALESCE(
        json_agg(pi.id ORDER BY pi.ordinal) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) as instances
    FROM products p
    LEFT JOIN product_instances pi ON pi."productId" = p.id
    GROUP BY p.id
  `);

  return { products, ... };
}
```

---

## Migration Strategy

### Phase 1: Add Columns (Non-Breaking)

1. Add FK columns with `NULL` allowed
2. Add ordinal columns with default `0`
3. Create indexes
4. Deploy

### Phase 2: Data Migration

```typescript
// Migration script
async function migrateProductInstances(dataSource: DataSource) {
  const products = await dataSource.query(`SELECT id, instances FROM products WHERE instances != '[]'`);

  for (const product of products) {
    const instances: string[] = product.instances;
    for (let i = 0; i < instances.length; i++) {
      await dataSource.query(`UPDATE product_instances SET "productId" = $1, ordinal = $2 WHERE id = $3`, [
        product.id,
        i,
        instances[i],
      ]);
    }
  }
}
```

### Phase 3: Make FK Required

1. `ALTER COLUMN ... SET NOT NULL`
2. Drop old array columns
3. Update repositories to use relations

### Phase 4: Cleanup

1. Remove fallback code
2. Update tests
3. Verify all queries use indexes (EXPLAIN ANALYZE)

---

## Files to Modify

### Entities

| File                          | Changes                               |
| ----------------------------- | ------------------------------------- |
| `product.entity.ts`           | Remove `instances` array              |
| `product-instance.entity.ts`  | Add `productId` FK + `ordinal`        |
| `option-type.entity.ts`       | Remove `options` array                |
| `option.entity.ts`            | Add `optionTypeId` FK + `ordinal`     |
| `category.entity.ts`          | Remove `products` + `children` arrays |
| `category-product.entity.ts`  | **NEW** - Join table                  |
| `category-children.entity.ts` | **NEW** - Join table (optional)       |

### Repositories

| File                                | Changes                                  |
| ----------------------------------- | ---------------------------------------- |
| `product.typeorm.repository.ts`     | Assembly logic for `instances`           |
| `option-type.typeorm.repository.ts` | Assembly logic for `options`             |
| `category.typeorm.repository.ts`    | Assembly logic for `products`/`children` |

### Services

| File                          | Changes                              |
| ----------------------------- | ------------------------------------ |
| `catalog-provider.service.ts` | Update catalog compilation if needed |

---

## What Does NOT Change

| Component            | Reason                                   |
| -------------------- | ---------------------------------------- |
| `wario-shared` DTOs  | API contract unchanged; still `string[]` |
| `wario-shared` logic | Works on interfaces, not storage         |
| Frontend apps        | Receives same JSON shape                 |
| Order entities       | Reference catalog by ID (temporal)       |

---

## Verification Plan

1. **Unit Tests**: Repository methods return correct DTO shape
2. **Integration Tests**: Full catalog fetch produces identical output
3. **Performance**: EXPLAIN ANALYZE on catalog queries shows index usage
4. **E2E**: Ordering flow works with normalized catalog

---

## Open Questions

- [ ] Should `children` remain as array (shallow hierarchy)?
- [ ] Do we need soft-delete cascades on join tables?
- [ ] Index strategy for hot catalog queries?
