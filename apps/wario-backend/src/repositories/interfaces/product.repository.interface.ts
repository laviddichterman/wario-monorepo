import type { IProduct } from '@wcp/wario-shared';

export interface IProductRepository {
  findById(id: string): Promise<IProduct | null>;
  findAll(): Promise<IProduct[]>;
  findByCategoryId(categoryId: string): Promise<IProduct[]>;
  create(product: Omit<IProduct, 'id'>): Promise<IProduct>;
  update(id: string, partial: Partial<Omit<IProduct, 'id'>>): Promise<IProduct | null>;
  delete(id: string): Promise<boolean>;
  /** Removes a category ID from category_ids array across all products */
  removeCategoryFromAll(categoryId: string): Promise<number>;
}

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');
