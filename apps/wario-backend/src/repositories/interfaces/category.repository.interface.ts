import type { ICategory } from '@wcp/wario-shared';

/**
 * Repository interface for Category operations.
 * Implemented by both Mongoose and TypeORM repositories.
 */
export interface ICategoryRepository {
  findById(id: string): Promise<ICategory | null>;
  findAll(): Promise<ICategory[]>;
  findByParentId(parentId: string | null): Promise<ICategory[]>;
  create(category: Omit<ICategory, 'id'>): Promise<ICategory>;
  update(id: string, partial: Partial<Omit<ICategory, 'id'>>): Promise<ICategory | null>;
  delete(id: string): Promise<boolean>;
  /** Removes a service ID from serviceDisable array across all categories */
  removeServiceDisableFromAll(serviceId: string): Promise<number>;
}

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository');
