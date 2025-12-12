import { Column, Entity } from 'typeorm';

import type { OrderInstanceFunction } from '@wcp/wario-shared';

import { TemporalEntity } from '../base/temporal.entity';

// Type for the order expression discriminated union
type IAbstractOrderExpression = OrderInstanceFunction['expression'];

/**
 * OrderInstanceFunction entity for storing expressions that evaluate order instances.
 *
 * These are discriminated union types with recursive nested expressions:
 * - ConstLiteral: Constant values (string, number, boolean)
 * - IfElse: Conditional branching
 * - Logical: AND, OR, NOT operations
 *
 * The `expression` field stores the full recursive expression tree as JSONB.
 * Runtime evaluation uses OrderFunctional.ProcessOrderInstanceFunction().
 */
@Entity('order_instance_functions')
export class OrderInstanceFunctionEntity extends TemporalEntity implements OrderInstanceFunction {
  @Column()
  name!: string;

  /**
   * Expression tree stored as JSONB.
   * Discriminated union type where `discriminator` field determines the type.
   * Supports nested expressions for order-level logic.
   */
  @Column('jsonb')
  expression!: IAbstractOrderExpression;
}
