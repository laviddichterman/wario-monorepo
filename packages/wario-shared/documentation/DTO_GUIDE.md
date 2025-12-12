# DTO Classes Guide

This document describes the Data Transfer Object (DTO) classes in the wario-shared package, which are designed to work with NestJS's `class-validator` and `class-transformer` packages.

## Overview

All DTO classes are located in `src/lib/dto/` and are exported from the main package. These DTOs mirror the TypeScript interfaces in `types.ts` but as classes with validation decorators, making them suitable for:

- NestJS API request/response validation
- Runtime type checking with class-validator
- Automatic transformation with class-transformer
- Serialization/deserialization of API payloads

## 2025 Schema Changes

The following breaking changes were introduced to simplify ordering and eliminate redundant fields:

### Removed DTOs

- `CatalogModifierEntryDto` - Ordering now embedded in `IOptionTypeDto.options`
- `CatalogCategoryEntryDto` - Ordering now embedded in `ICategoryDto.children` and `ICategoryDto.products`
- `CatalogProductEntryDto` - Ordering now embedded in `IProductDto.instances`

### Removed Fields

| DTO                   | Removed Field    | Replacement                                               |
| --------------------- | ---------------- | --------------------------------------------------------- |
| `IProductDto`         | `baseProductId`  | Use `instances[0]` (first element is base instance)       |
| `IProductDto`         | `category_ids`   | Categories reference products via `ICategoryDto.products` |
| `IProductInstanceDto` | `ordinal`        | Ordering is position in parent's `instances` array        |
| `IProductInstanceDto` | `productId`      | Prevents FK cycles; find via `IProductDto.instances`      |
| `ICategoryDto`        | `ordinal`        | Ordering is position in parent's `children` array         |
| `ICategoryDto`        | `parent_id`      | Tree is inverted; parent has `children` array             |
| `IOptionDto`          | `ordinal`        | Ordering is position in `IOptionTypeDto.options`          |
| `IOptionDto`          | `modifierTypeId` | Membership tracked via `IOptionTypeDto.options` array     |
| `IWSettingsDto`       | `config`         | Replaced with typed fields                                |

### New Fields

| DTO                     | New Field   | Description                                          |
| ----------------------- | ----------- | ---------------------------------------------------- |
| `ICategoryDto`          | `children`  | Ordered array of child category IDs                  |
| `ICategoryDto`          | `products`  | Ordered array of product IDs in this category        |
| `IOptionTypeDto`        | `options`   | Ordered array of option IDs                          |
| `IProductDto`           | `instances` | Ordered array of product instance IDs (first = base) |
| `IProductOrderGuideDto` | `errors`    | List of error function IDs (not yet implemented)     |

### Changed Functions

| Function                    | Change                                                         |
| --------------------------- | -------------------------------------------------------------- |
| `GroupAndOrderCart`         | Now takes `IdOrdinalMap` instead of category selector function |
| `EventTitleStringBuilder`   | Now takes `IdOrdinalMap` in addition to other parameters       |
| `IsOptionEnabled`           | Now takes `modifierTypeId` as first parameter                  |
| `ComputeCategoryTreeIdList` | Removed (redundant)                                            |
| `SortModifiersByOrdinal`    | Removed (redundant)                                            |
| `SortModifersAndOptions`    | Removed (options now pre-ordered in IOptionType.options)       |

### Usage Pattern: Sorting Maps

Where possible, use a sorting map (type `IdOrdinalMap`) instead of selector functions for ordering lookups.

### Root Category Requirement

> [!IMPORTANT]
> A **root category node** is required at the top of the category hierarchy. All other categories must be descendants of this root.
>
> - The root category's `children` array contains the top-level category IDs
> - Database initialization must create this root category (typically named "Root" or similar)

## File Structure

```
src/lib/dto/
├── common.dto.ts         # Base/fundamental DTOs
├── interval.dto.ts       # Time and date interval DTOs
├── fulfillment.dto.ts    # Fulfillment configuration DTOs
├── modifier.dto.ts       # Modifier/option DTOs
├── product.dto.ts        # Product and product instance DTOs
├── category.dto.ts       # Category DTOs
├── catalog.dto.ts        # Catalog DTOs
├── order.dto.ts          # Order, payment, and discount DTOs
└── expression.dto.ts     # Function expression DTOs
```

## Usage in NestJS

### Basic Controller Example

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrderRequestV2Dto } from '@wcp/wario-shared';

@Controller('orders')
export class OrdersController {
  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderRequestV2Dto) {
    // The DTO is automatically validated by class-validator
    // and transformed by class-transformer
    return this.ordersService.create(createOrderDto);
  }
}
```

### Using ValidationPipe Globally

In your `main.ts`:

```typescript
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(4001);
}
bootstrap();
```

### Manual Validation Example

```typescript
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IMoneyDto } from '@wcp/wario-shared';

// Transform plain object to DTO instance
const moneyDto = plainToClass(IMoneyDto, {
  amount: 1299,
  currency: 'USD',
});

// Validate
const errors = await validate(moneyDto);
if (errors.length > 0) {
  console.log('Validation failed:', errors);
} else {
  console.log('Validation succeeded!');
}
```

## DTO Categories

### Common DTOs (`common.dto.ts`)

Base types used throughout the application:

- `SemverDto` - Semantic version
- `WErrorDto` - Error structure
- `KeyValueDto` - Key-value pairs
- `IWIntervalDto` - Time interval
- `IMoneyDto` - Monetary amount
- `EncryptStringLockDto` - Encryption lock data
- `IRecurringIntervalDto` - Recurring time interval
- `TipSelectionPercentageDto` - Percentage-based tip
- `TipSelectionAmountDto` - Amount-based tip
- `AddressComponentDto` - Address component
- `DeliveryAddressValidateRequestDto` - Delivery address validation request
- `DeliveryAddressValidateResponseDto` - Delivery address validation response
- `DeliveryInfoDto` - Delivery information
- `SeatingSectionDto` - Seating section
- `IWSettingsDto` - Public application settings

> **2025 Schema Update**: `IWSettingsDto` no longer has a generic `config` key-value store. It now contains typed fields directly (e.g., `LOCATION_NAME`, `TAX_RATE`, `DEFAULT_FULFILLMENTID`).

### Interval DTOs (`interval.dto.ts`)

Time and scheduling related DTOs:

- `DateIntervalEntryDto` - Date interval entry
- `OperatingHourSpecificationDto` - Operating hours by day of week
- `PostBlockedOffToFulfillmentsRequestDto` - Request to block off time slots

### Fulfillment DTOs (`fulfillment.dto.ts`)

Fulfillment service configuration:

- `FulfillmentMessagesDto` - UI messages for fulfillment
- `FulfillmentAutogratDto` - Autogratuity configuration
- `FulfillmentConfigDto` - Complete fulfillment configuration

### Modifier DTOs (`modifier.dto.ts`)

Product modifiers and options:

- `IOptionTypeDisplayFlagsDto` - Display flags for option types
- `UncommittedOptionTypeDto` - Base data for creating/updating a modifier group (contains `options` field)
- `IOptionTypeDto` - Option/modifier type (extends `UncommittedOptionTypeDto`)
- `IOptionMetadataDto` - Option metadata
- `IOptionDisplayFlagsDto` - Option display flags
- `UncommittedOptionDto` - Base data for creating/updating an option
- `IOptionDto` - Option/modifier (extends `UncommittedOptionDto`)
- `IOptionStateDto` - Option state (placement/qualifier)
- `IOptionInstanceDto` - Option instance
- `CategoryDisplayFlagsDto` - Category display flags

> **2025 Schema Update**: `IOptionTypeDto.options` is now an ordered array of option IDs. The order in this array determines the display order. `IOptionDto` no longer has an `ordinal` field.

### Product DTOs (`product.dto.ts`)

Products and product instances:

- `PrepTimingDto` - Preparation timing
- `IProductOrderGuideDto` - Product order guide (warnings/suggestions/errors)
- `IProductDisplayFlagsDto` - Product display flags
- `IProductModifierDto` - Product modifier configuration
- `IProductDto` - Product
- `IProductInstanceDisplayFlagsPosDto` - POS display flags
- `IProductInstanceDisplayFlagsMenuDto` - Menu display flags
- `IProductInstanceDisplayFlagsOrderDto` - Order display flags
- `IProductInstanceDisplayFlagsDto` - All product instance display flags combined
- `ProductInstanceModifierEntryDto` - Product INSTANCE modifier entry
- `UncommittedIProductInstanceDto` - Base data for creating/updating a product instance
- `IProductInstanceDto` - Product instance (extends `UncommittedIProductInstanceDto`)

> **2025 Schema Update**:
>
> - `IProductDto.instances` is now an ordered array of product instance IDs. The first element is the base (default) product instance.
> - `IProductDto` no longer has a `baseProductId` field - use `instances[0]` instead.
> - `IProductDto` no longer has a `category_ids` field - categories now reference products via `ICategoryDto.products`.
> - `IProductInstanceDto` no longer has `ordinal` or `productId` fields - ordering is embedded in the parent's `instances` array.
> - `IProductInstanceDisplayFlagsMenuDto.ordinal` and `IProductInstanceDisplayFlagsOrderDto.ordinal` only affect ordering relative to other instances of the same product, not across products.

### Category DTOs (`category.dto.ts`)

Product categories:

- `CategoryDisplayFlagsDto` - Display configuration flags for categories
- `UncommittedCategoryDto` - Base data for creating/updating a category
- `ICategoryDto` - Category (extends `UncommittedCategoryDto`)

> **2025 Schema Update**: Categories now have `children` (ordered list of child category IDs) and `products` (ordered list of product IDs) fields. The `ordinal` and `parent_id` fields have been removed as the category tree is now inverted with ordering embedded in the array positions.

### Catalog DTOs (`catalog.dto.ts`)

Complete catalog structure:

- `ICatalogDto` - Complete catalog containing dictionaries of all catalog entities

> **2025 Schema Update**: The intermediate entry DTOs (`CatalogModifierEntryDto`, `CatalogCategoryEntryDto`, `CatalogProductEntryDto`) have been removed. Ordering information is now embedded directly in the parent entities:
>
> - `IOptionTypeDto.options` lists option IDs in display order
> - `ICategoryDto.children` lists child category IDs in display order
> - `ICategoryDto.products` lists product IDs in display order
> - `IProductDto.instances` lists product instance IDs in display order (first is the base instance)

### Order DTOs (`order.dto.ts`)

Orders, payments, and discounts:

#### Seating

- `SeatingResourceDto` - Seating resource
- `WSeatingInfoDto` - Seating information
- `DineInInfoDto` - Dine-in information

#### Fulfillment

- `ThirdPartyInfoDto` - Third party order info
- `FulfillmentTimeDto` - Fulfillment timing
- `FulfillmentDataDto` - Complete fulfillment data

#### Customer & Cart

- `CustomerInfoDataDto` - Customer information
- `WCPProductV2Dto` - Product reference
- `CoreCartEntryDto` - Cart entry
- `MetricsDto` - Order metrics/tracking

#### Payments

- `TenderBaseProposedDto` - Base proposed tender
- `TenderBaseAllocatedDto` - Base allocated tender
- `StoreCreditPaymentDataDto` - Store credit payment data
- `StoreCreditPaymentProposedDto` - Proposed store credit payment
- `StoreCreditPaymentAllocatedDto` - Allocated store credit payment
- `CashPaymentDataDto` - Cash payment data
- `CashPaymentProposedDto` - Proposed cash payment
- `CashPaymentAllocatedDto` - Allocated cash payment
- `CreditPaymentProposedDataDto` - Credit card proposed data
- `CreditPaymentProposedDto` - Proposed credit payment
- `CreditPaymentAllocatedDataDto` - Credit card allocated data
- `CreditPaymentAllocatedDto` - Allocated credit payment

#### Discounts

- `OrderManualPercentDiscountDataDto` - Manual percentage discount data
- `OrderManualPercentDiscountDto` - Manual percentage discount
- `OrderManualAmountDiscountDataDto` - Manual amount discount data
- `OrderManualAmountDiscountDto` - Manual amount discount
- `OrderLineDiscountCodeAmountDataDto` - Discount code data
- `OrderLineDiscountCodeAmountDto` - Discount code

#### Order

- `OrderTaxDto` - Tax information
- `IssueStoreCreditRequestDto` - Store credit issuance request
- `WOrderInstancePartialDto` - Partial order instance
- `CreateOrderRequestV2Dto` - Create order request
- `KeyValueOrderDto` - Order metadata key-value
- `WOrderInstanceDto` - Complete order instance

### Expression DTOs (`expression.dto.ts`)

Function expressions for business logic:

#### Const Literals

- `ConstStringLiteralExpressionDto`
- `ConstNumberLiteralExpressionDto`
- `ConstBooleanLiteralExpressionDto`
- `ConstModifierPlacementLiteralExpressionDto`
- `ConstModifierQualifierLiteralExpressionDto`

#### Expressions

- `ProductMetadataExpressionDto` - Product metadata expression
- `IModifierPlacementExpressionDto` - Modifier placement expression
- `IHasAnyOfModifierExpressionDto` - Has modifier check
- `IIfElseExpressionDto<T>` - If-else expression
- `ILogicalExpressionDto<T>` - Logical expression

#### Product Functions

- `AbstractExpressionConstLiteralDto`
- `AbstractExpressionProductMetadataDto`
- `AbstractExpressionModifierPlacementExpressionDto`
- `AbstractExpressionHasAnyOfModifierExpressionDto`
- `IProductInstanceFunctionDto` - Product instance function

#### Order Functions

- `AbstractOrderExpressionConstLiteralDto`
- `OrderInstanceFunctionDto` - Order instance function

## Validation Decorators Used

The DTOs use the following class-validator decorators:

- `@IsString()` - Validates string type
- `@IsNumber()` - Validates number type
- `@IsInt()` - Validates integer type
- `@IsBoolean()` - Validates boolean type
- `@IsEnum()` - Validates enum value
- `@IsArray()` - Validates array type
- `@IsObject()` - Validates object type
- `@IsNotEmpty()` - Ensures not empty
- `@IsOptional()` - Makes field optional
- `@Min()` - Minimum value validation
- `@ValidateNested()` - Validates nested objects
- `@Type()` - Class-transformer type hint

## Important Notes

### reflect-metadata

The DTOs require `reflect-metadata` to be imported at the application entry point:

```typescript
import 'reflect-metadata';
```

This is already included in the common.dto.ts file, but ensure your NestJS app also imports it in main.ts.

### Type vs Interface

The existing `types.ts` file contains TypeScript interfaces that should remain unchanged. The DTO classes serve as:

1. **Runtime validators** for API requests
2. **Serialization/deserialization** helpers
3. **Source of truth** for data validation rules

### Future Migration

As noted in the requirements, the plan is to eventually refactor `types.ts` to derive types from the DTO classes using utility types:

```typescript
// Future approach
import type { IMoneyDto } from './dto/common.dto';

export type IMoney = InstanceType<typeof IMoneyDto>;
// or using Omit/Pick to modify as needed
```

## Testing DTOs

Example test:

```typescript
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IMoneyDto } from '@wcp/wario-shared';

describe('IMoneyDto', () => {
  it('should validate valid money object', async () => {
    const dto = plainToClass(IMoneyDto, {
      amount: 1299,
      currency: 'USD',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid currency', async () => {
    const dto = plainToClass(IMoneyDto, {
      amount: 1299,
      currency: 'INVALID',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Always use DTOs for API boundaries** - Controllers should accept and return DTOs
2. **Transform at boundaries** - Use `plainToClass` when receiving data, `classToPlain` when sending
3. **Validate early** - Use NestJS ValidationPipe globally
4. **Keep DTOs simple** - DTOs should only contain validation logic, not business logic
5. **Use Type decorators** - Always use `@Type()` for nested objects/arrays
6. **Document validation** - Complex validation rules should be documented

## Dependencies

The DTO system requires these packages (already in package.json):

- `class-validator`: ^0.14.1
- `class-transformer`: ^0.5.1
- `reflect-metadata`: ^0.2.2

## Additional Resources

- [class-validator documentation](https://github.com/typestack/class-validator)
- [class-transformer documentation](https://github.com/typestack/class-transformer)
- [NestJS validation documentation](https://docs.nestjs.com/techniques/validation)
