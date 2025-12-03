import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';

import { ConstLiteralDiscriminator, LogicalFunctionOperator, MetadataField, OptionPlacement, OptionQualifier, OrderInstanceFunctionType, PRODUCT_LOCATION, ProductInstanceFunctionType } from '../enums';

// Const Literal Expressions
export class ConstStringLiteralExpressionDto {
  @IsEnum(ConstLiteralDiscriminator)
  discriminator!: ConstLiteralDiscriminator.STRING;

  @IsString()
  value!: string;
}

export class ConstNumberLiteralExpressionDto {
  @IsEnum(ConstLiteralDiscriminator)
  discriminator!: ConstLiteralDiscriminator.NUMBER;

  @IsNumber()
  value!: number;
}

export class ConstBooleanLiteralExpressionDto {
  @IsEnum(ConstLiteralDiscriminator)
  discriminator!: ConstLiteralDiscriminator.BOOLEAN;

  value!: boolean;
}

export class ConstModifierPlacementLiteralExpressionDto {
  @IsEnum(ConstLiteralDiscriminator)
  discriminator!: ConstLiteralDiscriminator.MODIFIER_PLACEMENT;

  @IsEnum(OptionPlacement)
  value!: OptionPlacement;
}

export class ConstModifierQualifierLiteralExpressionDto {
  @IsEnum(ConstLiteralDiscriminator)
  discriminator!: ConstLiteralDiscriminator.MODIFIER_QUALIFIER;

  @IsEnum(OptionQualifier)
  value!: OptionQualifier;
}

/**
 * Discriminated union type for constant literal expressions.
 * Used as the inner expression type for ConstLiteral abstract expressions.
 */
export type IConstLiteralExpressionDto =
  | ConstStringLiteralExpressionDto
  | ConstNumberLiteralExpressionDto
  | ConstBooleanLiteralExpressionDto
  | ConstModifierPlacementLiteralExpressionDto
  | ConstModifierQualifierLiteralExpressionDto;

// Product Metadata Expression
export class ProductMetadataExpressionDto {
  @IsEnum(MetadataField)
  field!: MetadataField;

  @IsEnum(PRODUCT_LOCATION)
  location!: PRODUCT_LOCATION;
}

// Modifier Placement Expression
export class IModifierPlacementExpressionDto {
  @IsString()
  @IsNotEmpty()
  mtid!: string;

  @IsString()
  @IsNotEmpty()
  moid!: string;
}

// Has Any Of Modifier Expression
export class IHasAnyOfModifierExpressionDto {
  @IsString()
  @IsNotEmpty()
  mtid!: string;
}

// Generic expression wrappers
export class IIfElseExpressionDto<T> {
  @ValidateNested()
  @Type(() => Object)
  true_branch!: T;

  @ValidateNested()
  @Type(() => Object)
  false_branch!: T;

  @ValidateNested()
  @Type(() => Object)
  test!: T;
}

export class ILogicalExpressionDto<T> {
  @ValidateNested()
  @Type(() => Object)
  operandA!: T;

  @ValidateNested()
  @Type(() => Object)
  operandB?: T;

  @IsEnum(LogicalFunctionOperator)
  operator!: LogicalFunctionOperator;
}

// Abstract Expression types for ProductInstance
export class AbstractExpressionConstLiteralDto {
  @ValidateNested()
  @Type(() => Object)
  expr!: IConstLiteralExpressionDto;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.ConstLiteral;
}

export class AbstractExpressionProductMetadataDto {
  @ValidateNested()
  @Type(() => ProductMetadataExpressionDto)
  expr!: ProductMetadataExpressionDto;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.ProductMetadata;
}

export class AbstractExpressionIfElseExpressionDto {
  @ValidateNested()
  @Type(() => IIfElseExpressionDto)
  expr!: IIfElseExpressionDto<IAbstractExpressionDto>;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.IfElse;
}

export class AbstractExpressionLogicalExpressionDto {
  @ValidateNested()
  @Type(() => ILogicalExpressionDto)
  expr!: ILogicalExpressionDto<IAbstractExpressionDto>;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.Logical;
}

export class AbstractExpressionModifierPlacementExpressionDto {
  @ValidateNested()
  @Type(() => IModifierPlacementExpressionDto)
  expr!: IModifierPlacementExpressionDto;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.ModifierPlacement;
}

export class AbstractExpressionHasAnyOfModifierExpressionDto {
  @ValidateNested()
  @Type(() => IHasAnyOfModifierExpressionDto)
  expr!: IHasAnyOfModifierExpressionDto;

  @IsEnum(ProductInstanceFunctionType)
  discriminator!: ProductInstanceFunctionType.HasAnyOfModifierType;
}

/**
 * Discriminated union type for product instance abstract expressions.
 * The discriminator field is ProductInstanceFunctionType enum.
 */
export type IAbstractExpressionDto =
  | AbstractExpressionConstLiteralDto
  | AbstractExpressionProductMetadataDto
  | AbstractExpressionIfElseExpressionDto
  | AbstractExpressionLogicalExpressionDto
  | AbstractExpressionModifierPlacementExpressionDto
  | AbstractExpressionHasAnyOfModifierExpressionDto;

export class IProductInstanceFunctionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => Object)
  expression!: IAbstractExpressionDto;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

// Abstract Expression types for Order
export class AbstractOrderExpressionConstLiteralDto {
  @ValidateNested()
  @Type(() => Object)
  expr!: IConstLiteralExpressionDto;

  @IsEnum(OrderInstanceFunctionType)
  discriminator!: OrderInstanceFunctionType.ConstLiteral;
}

export class AbstractOrderExpressionIfElseExpressionDto {
  @ValidateNested()
  @Type(() => IIfElseExpressionDto)
  expr!: IIfElseExpressionDto<IAbstractOrderExpressionDto>;

  @IsEnum(OrderInstanceFunctionType)
  discriminator!: OrderInstanceFunctionType.IfElse;
}

export class AbstractOrderExpressionLogicalExpressionDto {
  @ValidateNested()
  @Type(() => ILogicalExpressionDto)
  expr!: ILogicalExpressionDto<IAbstractOrderExpressionDto>;

  @IsEnum(OrderInstanceFunctionType)
  discriminator!: OrderInstanceFunctionType.Logical;
}

/**
 * Discriminated union type for order instance abstract expressions.
 * The discriminator field is OrderInstanceFunctionType enum.
 */
export type IAbstractOrderExpressionDto =
  | AbstractOrderExpressionConstLiteralDto
  | AbstractOrderExpressionIfElseExpressionDto
  | AbstractOrderExpressionLogicalExpressionDto;

export class IOrderInstanceFunctionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @Type(() => Object)
  expression!: IAbstractOrderExpressionDto;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
