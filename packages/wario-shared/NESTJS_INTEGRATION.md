# Using DTOs in wario-backend

This guide shows how to integrate the new DTO classes from wario-shared into the wario-backend NestJS application.

## Setup

### 1. Install Required Dependencies

The wario-shared package already includes the dependencies, but ensure your backend has the required peer dependencies:

```bash
cd apps/wario-backend
pnpm add class-validator class-transformer
```

### 2. Configure Global Validation Pipe

Update `apps/wario-backend/src/main.ts`:

```typescript
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transformOptions: {
        enableImplicitConversion: true, // Convert string "123" to number 123
      },
    }),
  );

  await app.listen(4001);
}
bootstrap();
```

## Example Controller: Orders

Create a new orders controller that uses DTOs:

```typescript
// apps/wario-backend/src/orders/orders.controller.ts
import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  Put, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { 
  CreateOrderRequestV2Dto, 
  WOrderInstanceDto,
  CrudOrderResponse 
} from '@wcp/wario-shared';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateOrderRequestV2Dto,
  ): Promise<CrudOrderResponse> {
    // The DTO is automatically validated and transformed
    return this.ordersService.create(createOrderDto);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<WOrderInstanceDto> {
    return this.ordersService.findOne(id);
  }

  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: Partial<WOrderInstanceDto>,
  ): Promise<CrudOrderResponse> {
    return this.ordersService.update(id, updateOrderDto);
  }
}
```

## Example Service

```typescript
// apps/wario-backend/src/orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { 
  CreateOrderRequestV2Dto, 
  WOrderInstanceDto,
  CrudOrderResponse,
  WOrderStatus,
  TenderBaseStatus
} from '@wcp/wario-shared';

@Injectable()
export class OrdersService {
  private orders: Map<string, WOrderInstanceDto> = new Map();

  async create(createOrderDto: CreateOrderRequestV2Dto): Promise<CrudOrderResponse> {
    try {
      // Transform to order instance
      const order = plainToClass(WOrderInstanceDto, {
        ...createOrderDto,
        id: this.generateId(),
        status: WOrderStatus.OPEN,
        discounts: [],
        payments: createOrderDto.proposedPayments.map(p => ({
          ...p,
          status: TenderBaseStatus.AUTHORIZED,
          processorId: this.generateProcessorId(),
        })),
        refunds: [],
        taxes: [],
        metadata: [],
        locked: null,
      });

      // Validate the constructed order
      const errors = await validate(order);
      if (errors.length > 0) {
        return {
          success: false,
          error: errors.map(e => ({
            category: 'validation',
            code: 'INVALID_ORDER',
            detail: Object.values(e.constraints || {}).join(', '),
          })),
        };
      }

      // Store the order
      this.orders.set(order.id, order);

      return {
        success: true,
        result: order,
      };
    } catch (error) {
      return {
        success: false,
        error: [{
          category: 'server',
          code: 'INTERNAL_ERROR',
          detail: error.message,
        }],
      };
    }
  }

  async findOne(id: string): Promise<WOrderInstanceDto> {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateDto: Partial<WOrderInstanceDto>): Promise<CrudOrderResponse> {
    const existing = await this.findOne(id);
    
    const updated = plainToClass(WOrderInstanceDto, {
      ...existing,
      ...updateDto,
    });

    const errors = await validate(updated);
    if (errors.length > 0) {
      return {
        success: false,
        error: errors.map(e => ({
          category: 'validation',
          code: 'INVALID_UPDATE',
          detail: Object.values(e.constraints || {}).join(', '),
        })),
      };
    }

    this.orders.set(id, updated);

    return {
      success: true,
      result: updated,
    };
  }

  private generateId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProcessorId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Example: Catalog Controller

```typescript
// apps/wario-backend/src/catalog/catalog.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { 
  ICatalogDto, 
  IProductDto, 
  IProductInstanceDto,
  IOptionDto,
  IOptionTypeDto,
  ICategoryDto
} from '@wcp/wario-shared';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalog(): ICatalogDto {
    return this.catalogService.getCatalog();
  }

  @Post('products')
  createProduct(@Body() productDto: IProductDto): IProductDto {
    return this.catalogService.createProduct(productDto);
  }

  @Post('product-instances')
  createProductInstance(@Body() instanceDto: IProductInstanceDto): IProductInstanceDto {
    return this.catalogService.createProductInstance(instanceDto);
  }

  @Post('options')
  createOption(@Body() optionDto: IOptionDto): IOptionDto {
    return this.catalogService.createOption(optionDto);
  }

  @Post('option-types')
  createOptionType(@Body() optionTypeDto: IOptionTypeDto): IOptionTypeDto {
    return this.catalogService.createOptionType(optionTypeDto);
  }

  @Post('categories')
  createCategory(@Body() categoryDto: ICategoryDto): ICategoryDto {
    return this.catalogService.createCategory(categoryDto);
  }
}
```

## Example: Fulfillment Controller

```typescript
// apps/wario-backend/src/fulfillment/fulfillment.controller.ts
import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { 
  FulfillmentConfigDto,
  PostBlockedOffToFulfillmentsRequestDto,
  SetLeadTimesRequest
} from '@wcp/wario-shared';
import { FulfillmentService } from './fulfillment.service';

@Controller('fulfillment')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Get()
  getAllFulfillments(): FulfillmentConfigDto[] {
    return this.fulfillmentService.getAll();
  }

  @Get(':id')
  getFulfillment(@Param('id') id: string): FulfillmentConfigDto {
    return this.fulfillmentService.getOne(id);
  }

  @Post()
  createFulfillment(@Body() dto: FulfillmentConfigDto): FulfillmentConfigDto {
    return this.fulfillmentService.create(dto);
  }

  @Post('blocked-off')
  addBlockedOff(@Body() dto: PostBlockedOffToFulfillmentsRequestDto): void {
    this.fulfillmentService.addBlockedOff(dto);
  }

  @Put('lead-times')
  setLeadTimes(@Body() dto: SetLeadTimesRequest): void {
    this.fulfillmentService.setLeadTimes(dto);
  }
}
```

## Custom Validation Example

Create custom validators for business logic:

```typescript
// apps/wario-backend/src/validators/is-valid-product-price.validator.ts
import { 
  registerDecorator, 
  ValidationOptions, 
  ValidatorConstraint, 
  ValidatorConstraintInterface,
  ValidationArguments 
} from 'class-validator';
import { IMoneyDto } from '@wcp/wario-shared';

@ValidatorConstraint({ async: false })
export class IsValidProductPriceConstraint implements ValidatorConstraintInterface {
  validate(money: IMoneyDto, args: ValidationArguments) {
    // Business rule: product prices must be between $0.01 and $999.99
    return money.amount >= 1 && money.amount <= 99999;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Product price must be between $0.01 and $999.99';
  }
}

export function IsValidProductPrice(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidProductPriceConstraint,
    });
  };
}

// Usage in a custom DTO that extends base DTO:
import { IProductDto } from '@wcp/wario-shared';

export class CreateProductDto extends IProductDto {
  @IsValidProductPrice()
  price!: IMoneyDto;
}
```

## Error Handling

```typescript
// apps/wario-backend/src/filters/validation-exception.filter.ts
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  BadRequestException 
} from '@nestjs/common';
import { Response } from 'express';
import { WErrorDto } from '@wcp/wario-shared';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errors: WErrorDto[] = Array.isArray(exceptionResponse['message'])
      ? exceptionResponse['message'].map(msg => ({
          category: 'validation',
          code: 'INVALID_INPUT',
          detail: msg,
        }))
      : [{
          category: 'validation',
          code: 'INVALID_INPUT',
          detail: exceptionResponse['message'] || 'Validation failed',
        }];

    response.status(status).json({
      success: false,
      error: errors,
    });
  }
}

// Register in main.ts:
app.useGlobalFilters(new ValidationExceptionFilter());
```

## Testing with DTOs

```typescript
// apps/wario-backend/src/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { 
  CreateOrderRequestV2Dto, 
  CustomerInfoDataDto,
  FulfillmentDataDto,
  WFulfillmentStatus,
  PaymentMethod,
  CreditPaymentProposedDto,
  TenderBaseStatus
} from '@wcp/wario-shared';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('should validate and create order', async () => {
      const createOrderDto = plainToClass(CreateOrderRequestV2Dto, {
        customerInfo: {
          givenName: 'John',
          familyName: 'Doe',
          email: 'john@example.com',
          mobileNum: '+1234567890',
          referral: '',
        },
        fulfillment: {
          selectedDate: '2024-01-15',
          selectedTime: 1200,
          status: WFulfillmentStatus.PROPOSED,
          selectedService: 'pickup',
        },
        cart: [],
        tip: { value: 15, isSuggestion: false, isPercentage: true },
        proposedPayments: [{
          t: PaymentMethod.CreditCard,
          amount: { amount: 2500, currency: 'USD' },
          tipAmount: { amount: 375, currency: 'USD' },
          createdAt: Date.now(),
          status: TenderBaseStatus.PROPOSED,
          payment: { sourceId: 'tok_123' },
        }],
        proposedDiscounts: [],
      });

      const errors = await validate(createOrderDto);
      expect(errors.length).toBe(0);

      const result = await controller.createOrder(createOrderDto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid order', async () => {
      const invalidDto = plainToClass(CreateOrderRequestV2Dto, {
        // Missing required fields
        customerInfo: {},
      });

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
```

## GraphQL Integration (Optional)

If using GraphQL with NestJS:

```typescript
// apps/wario-backend/src/orders/dto/order.input.ts
import { InputType, Field } from '@nestjs/graphql';
import { CreateOrderRequestV2Dto } from '@wcp/wario-shared';

@InputType()
export class CreateOrderInput extends CreateOrderRequestV2Dto {
  // GraphQL-specific customizations if needed
}

// apps/wario-backend/src/orders/dto/order.type.ts
import { ObjectType, Field } from '@nestjs/graphql';
import { WOrderInstanceDto } from '@wcp/wario-shared';

@ObjectType()
export class OrderType extends WOrderInstanceDto {
  // GraphQL-specific fields if needed
}
```

## Best Practices

1. **Always validate at the boundary** - Let NestJS ValidationPipe handle it
2. **Use DTOs for all inputs** - Controllers should only accept DTOs
3. **Transform when needed** - Use `plainToClass` when creating instances programmatically
4. **Return DTOs from services** - Keep type safety throughout the stack
5. **Test validation rules** - Write tests for DTO validation
6. **Document validation** - Use JSDoc comments on custom validators

## Common Patterns

### Pattern 1: Partial Updates
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { IProductDto } from '@wcp/wario-shared';

export class UpdateProductDto extends PartialType(IProductDto) {}
```

### Pattern 2: Omit Fields
```typescript
import { OmitType } from '@nestjs/mapped-types';
import { IProductDto } from '@wcp/wario-shared';

export class CreateProductDto extends OmitType(IProductDto, ['id'] as const) {}
```

### Pattern 3: Pick Fields
```typescript
import { PickType } from '@nestjs/mapped-types';
import { CustomerInfoDataDto } from '@wcp/wario-shared';

export class UpdateCustomerDto extends PickType(CustomerInfoDataDto, [
  'givenName',
  'familyName',
  'email',
] as const) {}
```

## Troubleshooting

### Issue: "Cannot find module 'reflect-metadata'"
**Solution:** Import at the top of main.ts:
```typescript
import 'reflect-metadata';
```

### Issue: Validation not working
**Solution:** Ensure ValidationPipe is registered globally:
```typescript
app.useGlobalPipes(new ValidationPipe({ transform: true }));
```

### Issue: Nested objects not validating
**Solution:** Use both @ValidateNested() and @Type():
```typescript
@ValidateNested()
@Type(() => IMoneyDto)
price!: IMoneyDto;
```

### Issue: Arrays not transforming
**Solution:** Use Type decorator with array syntax:
```typescript
@ValidateNested({ each: true })
@Type(() => IProductDto)
products!: IProductDto[];
```
