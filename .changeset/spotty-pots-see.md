---
'@wcp/wario-shared': patch
---

Changes Breakdown
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
