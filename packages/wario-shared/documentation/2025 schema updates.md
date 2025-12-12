# 2025 Schema Updates

> **Status**: ✅ IMPLEMENTED (December 2025)
>
> This document describes schema changes that have been implemented. Documentation has been updated in:
>
> - `DTO_GUIDE.md` - Main DTO reference with breaking changes summary
> - `DTO_IMPLEMENTATION.md` - Implementation details
> - `packages/wario-ux-shared/src/query/IMPLEMENTATION_SUMMARY.md` - Query hook documentation
>
> The following types use these new patterns. See `DTO_GUIDE.md` for the full breaking changes table.

## Root Category Requirement

**CRITICAL**: The 2025 schema requires a **root category node** at the top of the category hierarchy.

- All categories must be descendants of this root category
- The root category's `children` array defines the ordering of top-level categories
- Database initialization on an empty install **must create this root category** (typically named "Root")

Update the documentation throughout the codebase to reflect the following changes to the wario-shared package:

- CatalogModifierEntryDto has been removed (as has the derived CatalogModifierEntry) since the IOptionTypeDto now contains an ordered list of options corresponding to the IOption in the modifier group.
- CatalogCategoryEntryDto has been removed (as has the derived CatalogCategoryEntry) since the ICategoryDto now contains an ordered list of products corresponding to the IProduct in the category. It also contains a list of children category IDs.
- CatalogProductEntryDto has been removed (as has the derived CatalogProductEntry) since the IProductDto now contains an ordered list of instances corresponding to the IProductInstance associated with the product.

- UncommittedCategoryDto (and derived objects and interfaces)
  - has a children field listing child category IDs in the order they should be displayed
  - has a products field listing IDs to IProductDto objects in the order they should be displayed
  - no longer has an ordinal or parent_id field. The parent_id is now not needed as the category tree is inverted with each category containing a list of child category IDs. That list is ordered, so the ordinal is no longer needed.
- IWSettingsDto no longer has a generic key value store named config. It now contains typed fields which correspond to what used to be stored in the config object.
- UncommittedOptionTypeDto (and derived objects and interfaces) now has an options field listing IDs corresponding to IOption objects in the order that they should be displayed.
- UncommittedOptionDto (and derived objects and interfaces) no longer has an ordinal field as the options are now ordered by their position in the IOptionTypeDto modifier group.
- IOptionDto no longer has a modifierTypeId field as the option's membership in a modifier group is tracked via the IOptionTypeDto.options array.
- IProductOrderGuideDto now has an errors field listing IDs of IProductInstanceFunctions that would indicate an illegal product. This code path is not used, but is included for future use.
- UncommittedIProductDto (and derived objects and interfaces)
  - now has an instances field listing IDs corresponding to IProductInstanceDto objects in the order that they should be displayed.
  - no longer has a category_ids field since the ICategoryDto now has a products field listing the equivalent information
- IProductDto (and derived objects and interfaces)
  - no longer has a baseProductId since the base product is the first product instance ID in the instances list
  - the instances list is documented to show that the first product instance is the equivalent of the base product instance and the naming of a given product instance will start from the end of the instances array and work towards the first element in the list.
- IProductInstanceDisplayFlagsOrderDto maintains an ordinal field, but it only allows for ordering of the product instances from within the same product. It is not used for ordering of the product instances relative to other products.
- IProductInstanceDisplayFlagsMenuDto maintains an ordinal field, but it only allows for ordering of the product instances from within the same product. It is not used for ordering of the product instances relative to other products.
- UncommittedIProductInstanceDto (and derived objects and interfaces)
  - no longer has an oridinal field as the instances list has this information embedded in its ordering.
  - no longer has a productId field, as the IProductDto instances list contains the equivalent information and prevents a foreign key cycle.

Functions:

- GroupAndOrderCart now takes a list of a sorting map for the categories instead of a category selector function
- EventTitleStringBuilder now takes a list of a sorting map for the categories in addition to its other parameters
- IsOptionEnabled now takes modifierTypeId as its first parameter
- ComputeCategoryTreeIdList is removed as redundant
- SortModifiersByOrdinal is removed as redundant
- SortModifersAndOptions is removed as redundant (options are now pre-ordered in IOptionType.options)

Usage notes:

- Where possible, a sorting map should be used instead of a selector function to look up ordering and to see if a given ID is in the list
