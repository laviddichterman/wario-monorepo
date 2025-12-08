import type { OrderInstanceFunction } from '@wcp/wario-shared';

export interface IOrderInstanceFunctionRepository {
  findById(id: string): Promise<OrderInstanceFunction | null>;
  findAll(): Promise<OrderInstanceFunction[]>;
  create(fn: Omit<OrderInstanceFunction, 'id'>): Promise<OrderInstanceFunction>;
  update(id: string, partial: Partial<Omit<OrderInstanceFunction, 'id'>>): Promise<OrderInstanceFunction | null>;
  save(fn: Omit<OrderInstanceFunction, 'id'> & { id?: string }): Promise<OrderInstanceFunction>;
  delete(id: string): Promise<boolean>;
}

export const ORDER_INSTANCE_FUNCTION_REPOSITORY = Symbol('IOrderInstanceFunctionRepository');

