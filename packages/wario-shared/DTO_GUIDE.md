# DTO Classes Guide

This document describes the Data Transfer Object (DTO) classes in the wario-shared package, which are designed to work with NestJS's `class-validator` and `class-transformer` packages.

## Overview

All DTO classes are located in `src/lib/dto/` and are exported from the main package. These DTOs mirror the TypeScript interfaces in `types.ts` but as classes with validation decorators, making them suitable for:

- NestJS API request/response validation
- Runtime type checking with class-validator
- Automatic transformation with class-transformer
- Serialization/deserialization of API payloads

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
- `IOptionTypeDto` - Option/modifier type
- `IOptionMetadataDto` - Option metadata
- `IOptionDisplayFlagsDto` - Option display flags
- `IOptionDto` - Option/modifier
- `IOptionStateDto` - Option state (placement/qualifier)
- `IOptionInstanceDto` - Option instance
- `CategoryDisplayFlagsDto` - Category display flags

### Product DTOs (`product.dto.ts`)

Products and product instances:

- `PrepTimingDto` - Preparation timing
- `IProductOrderGuideDto` - Product order guide (warnings/suggestions)
- `IProductDisplayFlagsDto` - Product display flags
- `IProductModifierDto` - Product modifier configuration
- `IProductDto` - Product
- `IProductInstanceDisplayFlagsPosDto` - POS display flags
- `IProductInstanceDisplayFlagsMenuDto` - Menu display flags
- `IProductInstanceDisplayFlagsOrderDto` - Order display flags
- `IProductInstanceDisplayFlagsDto` - All product instance display flags combined
- `ProductModifierEntryDto` - Product modifier entry
- `IProductInstanceDto` - Product instance

### Category DTOs (`category.dto.ts`)

Product categories:

- `ICategoryDto` - Category

### Catalog DTOs (`catalog.dto.ts`)

Complete catalog structure:

- `CatalogModifierEntryDto` - Catalog modifier entry
- `CatalogCategoryEntryDto` - Catalog category entry
- `CatalogProductEntryDto` - Catalog product entry
- `ICatalogDto` - Complete catalog

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
