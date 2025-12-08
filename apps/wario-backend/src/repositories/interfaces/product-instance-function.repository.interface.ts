import type { IProductInstanceFunction } from '@wcp/wario-shared';

export interface IProductInstanceFunctionRepository {
  findById(id: string): Promise<IProductInstanceFunction | null>;
  findAll(): Promise<IProductInstanceFunction[]>;
  save(fn: Omit<IProductInstanceFunction, 'id'> & { id?: string }): Promise<IProductInstanceFunction>;
  delete(id: string): Promise<boolean>;
}

export const PRODUCT_INSTANCE_FUNCTION_REPOSITORY = Symbol('IProductInstanceFunctionRepository');
