---
'@wcp/wario-backend': patch
'@wcp/wario-shared': patch
---

Fix Square external ID handling and category cycle detection

- **Removed `ProductInstanceUpdateMergeExternalIds`**: This was previously clobbering existing Square IDs during batch product updates. External IDs are now preserved correctly.
- **Added `ProductInstanceToSquareCatalogHelper`**: New helper that detects and repairs broken Square external IDs by deleting orphaned catalog entries before creating new ones.
- **Fixed `CategoryIdHasCycleIfChildOfProposedCategoryId`**: Corrected the traversal logic to properly detect cycles when reassigning category parents.
- **Refactored Mongoose repositories**: Introduced `toEntity` utility to consistently strip `_id` and `__v` fields.
- **Added `isProduction` flag injection**: Order payment, printing, and store credit services now use injected config instead of environment variable.
