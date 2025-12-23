---
'@wcp/wario-backend': minor
'@wcp/wario-shared': patch
---

### Breaking Changes

- `deleteProductInstance` now requires `productId` parameter in addition to `productInstanceId`
- `batchUpsertProduct` now throws `Error` instead of returning `null` for validation failures

### Improvements

- Added comprehensive validation in `batchUpsertProduct`: checks that all referenced instance IDs belong to the product and all existing instances are referenced
- Improved error messages for validation failures with specific details about what failed
- `UpdateIProductRequestDto.instances` is now optional - omitting it leaves existing instances unchanged

### Tests

- Added `catalog-modifier.functions.spec.ts` with 11 tests for modifier type and option operations
- Expanded `catalog-product.functions.spec.ts` to 48 tests including edge cases for modifier removal during product updates
- Added tests for explicit instance updates with illegal modifier references
