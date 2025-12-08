import { Column, Entity } from 'typeorm';

import type { IAbstractExpression, IProductInstanceFunction } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

/**
 * ProductInstanceFunction entity for storing expressions that evaluate product instances.
 * 
 * These are discriminated union types with recursive nested expressions:
 * - ConstLiteral: Constant values (string, number, boolean, placement, qualifier)
 * - ProductMetadata: Access product metadata fields
 * - IfElse: Conditional branching
 * - Logical: AND, OR, NOT operations
 * - ModifierPlacement: Check modifier placement
 * - HasAnyOfModifierType: Check if modifier type exists
 * 
 * The `expression` field stores the full recursive expression tree as JSONB.
 * Runtime evaluation uses WFunctional.ProcessProductInstanceFunction().
 */
@Entity('product_instance_functions')
export class ProductInstanceFunctionEntity
  extends TemporalEntity
  implements IProductInstanceFunction {
  @Column()
  name!: string;

  /**
   * Expression tree stored as JSONB.
   * Discriminated union type where `discriminator` field determines the type.
   * Recursive structure supports nested expressions.
   */
  @Column('jsonb')
  expression!: IAbstractExpression;
}
