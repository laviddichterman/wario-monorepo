---
'@wcp/wario-shared': major
---

## 2025 Schema Updates - Breaking Changes

This release restructures how ordering is handled in the catalog, embedding ordering information directly in parent entities rather than using intermediate entry types.

### Removed DTOs

- `CatalogModifierEntryDto` - Ordering now embedded in `IOptionTypeDto.options`
- `CatalogCategoryEntryDto` - Ordering now embedded in `ICategoryDto.children` and `ICategoryDto.products`
- `CatalogProductEntryDto` - Ordering now embedded in `IProductDto.instances`

### Removed Fields

| Type               | Field                       | Replacement                                  |
| ------------------ | --------------------------- | -------------------------------------------- |
| `IProduct`         | `baseProductId`             | Use `instances[0]`                           |
| `IProduct`         | `category_ids`              | Use `ICategory.products`                     |
| `IProductInstance` | `ordinal`, `productId`      | Position in `IProduct.instances`             |
| `ICategory`        | `ordinal`, `parent_id`      | Position in parent's `children`              |
| `IOption`          | `ordinal`, `modifierTypeId` | Position/membership in `IOptionType.options` |
| `IWSettings`       | `config`                    | Typed fields added directly                  |

### New Fields

- `ICategory.children` - Ordered child category IDs
- `ICategory.products` - Ordered product IDs in category
- `IOptionType.options` - Ordered option IDs
- `IProduct.instances` - Ordered product instance IDs (first = base)
- `IProductOrderGuide.errors` - Error function IDs (not yet implemented)

### Changed Function Signatures

- `GroupAndOrderCart` - Now takes `IdOrdinalMap` instead of category selector
- `EventTitleStringBuilder` - Now takes `IdOrdinalMap` parameter
- `IsOptionEnabled` - Now takes `modifierTypeId` as first parameter

### Removed Functions

- `ComputeCategoryTreeIdList` - Redundant
- `SortModifiersByOrdinal` - Redundant
- `SortModifersAndOptions` - Redundant (options now pre-ordered in IOptionType.options)

### Migration Notes

**Root Category Requirement**: A root category node must exist at the top of the category hierarchy. Database initialization on an empty install must create this root category (typically named "Root"). All other categories must be descendants of this root.

Where possible, use `IdOrdinalMap` (a `Record<string, number>`) for ordering lookups instead of selector functions.

See `packages/wario-shared/documentation/DTO_GUIDE.md` for complete documentation.
