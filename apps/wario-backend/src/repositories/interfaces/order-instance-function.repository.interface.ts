import type { OrderInstanceFunction } from '@wcp/wario-shared';

export interface IOrderInstanceFunctionRepository {
  findById(id: string): Promise<OrderInstanceFunction | null>;
  findAll(): Promise<OrderInstanceFunction[]>;
  save(fn: Omit<OrderInstanceFunction, 'id'> & { id?: string }): Promise<OrderInstanceFunction>;
  delete(id: string): Promise<boolean>;
}

export const ORDER_INSTANCE_FUNCTION_REPOSITORY = Symbol('IOrderInstanceFunctionRepository');
