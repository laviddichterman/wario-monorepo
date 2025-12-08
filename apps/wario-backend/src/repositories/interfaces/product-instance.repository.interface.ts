import type { IProductInstance } from '@wcp/wario-shared';

export interface IProductInstanceRepository {
  findById(id: string): Promise<IProductInstance | null>;
  findAll(): Promise<IProductInstance[]>;
  findByProductId(productId: string): Promise<IProductInstance[]>;
  create(instance: Omit<IProductInstance, 'id'>): Promise<IProductInstance>;
  update(id: string, partial: Partial<Omit<IProductInstance, 'id'>>): Promise<IProductInstance | null>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  bulkCreate(instances: Omit<IProductInstance, 'id'>[]): Promise<IProductInstance[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProductInstance, 'id'>> }>): Promise<number>;
  bulkDelete(ids: string[]): Promise<number>;
  deleteByProductIds(productIds: string[]): Promise<number>;

  /** Removes option selections matching modifier type from all instances */
  removeModifierTypeSelectionsFromAll(mtId: string): Promise<number>;
}

export const PRODUCT_INSTANCE_REPOSITORY = Symbol('IProductInstanceRepository');
