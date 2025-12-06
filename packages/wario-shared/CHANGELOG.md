# @wcp/wario-shared

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
