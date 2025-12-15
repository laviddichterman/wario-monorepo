# @wcp/wario-shared

## 2.0.0

### Major Changes

- 99895f1: ## 2025 Schema Updates - Breaking Changes

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

### Minor Changes

- b4cbd1d: The package provides multiple entry points to avoid bundling unnecessary dependencies:

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

### Patch Changes

- aaa7803: Changes Breakdown
  Main Entry Point (index.ts)
  Before: Exported all modules directly
  After: Simplified to use barrel exports via new entry points

  -export _ from './lib/common';
  -export _ from './lib/derived-types';
  -export _ from './lib/dto/api.dto';
  -// ... 20+ lines
  +export _ from './lib/dto/index';
  +export _ from './logic.entry';
  +export _ from './types.entry';
  DTO Structure (api.dto.ts)
  Refactored option/option type DTOs for better clarity:

  New naming pattern:

  CreateIOptionRequestBodyDto - The option data (without id)
  CreateIOptionPropsDto - The full request (includes modifierTypeId + option)
  UpdateIOptionPropsDto - Update variant (includes id + modifierTypeId + option)
  Same pattern for option types:

  CreateIOptionTypeRequestBodyDto - Modifier type data (without id, includes nested options[])
  UpdateIOptionTypeRequestBodyDto - Partial update of modifier type
  UpdateIOptionTypePropsDto - Full update props (includes id + modifierType)
  Catalog Type Migration
  Before: ICatalog defined as DTO in catalog.dto.ts
  After: ICatalog is now a runtime type in types.ts

  This is architecturally correct because:

  ICatalog is never sent over the wire as-is (it's a compiled/derived structure)
  DTOs should only contain data that crosses API boundaries
  Runtime types belong in types.ts per the package conventions
  Test Improvements
  tests/mocks.ts
  :

  // Default Square external IDs so tests properly trigger BatchRetrieveCatalogObjects
  externalIDs: [
  { key: 'SQID_ITEM', value: 'FAKE_SQID_ITEM' },
  { key: 'SQID_ITEM_VARIATION', value: 'FAKE_SQID_ITEM_VARIATION' },
  ],
  This ensures mock product instances have Square IDs by default, making tests more realistic.

## 1.1.0

### Minor Changes

- f7b0795: fix descriminated type creation and derivation

## 1.0.0

### Major Changes

- e25448c: switch to class based types and derive from those to maintain parity.
  since class-validator and class-transformer use the Dto suffix, we've renamed the following types to avoid confusion between the base types and the Dto pattern
  - all instances of FulfillmentDto should be renamed to FulfillmentData
  - all instances of CustomerInfoDto should be renamed to CustomerInfoData
  - all instances of FulfillmentDto should be renamed to FulfillmentData
- 2a53eb8: move enums to their own file
  rename types ending in Dto to something else to avoid future refactor changes
  add support for decorators for future refactor

## 0.4.1

### Patch Changes

- ae61940: Add CJS exports to wario-shared

## 0.4.0

### Minor Changes

- b84680e: remove grouping comma for numbers, be more permissive with parseInteger

## 0.3.1

### Patch Changes

- 387050c: add some helper types and improve PurchaseStoreCreditRequest

## 0.3.0

### Minor Changes

- 7dcef5d: - wario-shared: updates to numbers helper functions to allow for non-fixed precision decimal numbers
  - wario-ux-shared: move all input components into a subdirectory
  - wario-ux-shared: implement CheckedNumericTextInput with wario-shared number functions
  - wario-ux-shared: implement RHFTextField with wario-shared number functions
- 41e59f8: Move number parsing and formatting to wario-shared
  Move RoundToTwoDecimalPlaces to the numbers method
  Add tests for numbers methods

## 0.2.1

### Patch Changes

- 04b6b4e: add linting fixes
- 05b2fcb: move SortProductModifierEntries, SortProductModifierOptions, SortAndFilterModifierOptions, FilterUnselectableModifierOption into wario-shared

## 0.2.0

### Minor Changes

- first version that compiles across most of the stack

## 0.1.2

### Patch Changes

- try again

## 0.1.1

### Patch Changes

- initial publish using monorepo

## 0.1.0

### Minor Changes

- 331df09: initial publish
