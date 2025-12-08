import type { IProduct } from '@wcp/wario-shared';

export interface BulkWriteOperation<T> {
  type: 'insert' | 'update' | 'delete';
  id?: string;
  data?: Partial<Omit<T, 'id'>>;
  filter?: Partial<T>;
}

export interface BulkWriteResult {
  insertedCount: number;
  modifiedCount: number;
  deletedCount: number;
}

export interface IProductRepository {
  findById(id: string): Promise<IProduct | null>;
  findAll(): Promise<IProduct[]>;
  findByCategoryId(categoryId: string): Promise<IProduct[]>;
  findByQuery(filter: Partial<IProduct>): Promise<IProduct[]>;
  create(product: Omit<IProduct, 'id'>): Promise<IProduct>;
  update(id: string, partial: Partial<Omit<IProduct, 'id'>>): Promise<IProduct | null>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  bulkCreate(products: Omit<IProduct, 'id'>[]): Promise<IProduct[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IProduct, 'id'>> }>): Promise<number>;
  bulkDelete(ids: string[]): Promise<number>;

  /** Removes a category ID from category_ids array across all products */
  removeCategoryFromAll(categoryId: string): Promise<number>;
  /** Removes a modifier type from modifiers array across all matching products */
  removeModifierTypeFromAll(mtId: string): Promise<number>;
  /** Clears enable field in modifiers for a ProductInstanceFunction cascade delete */
  clearModifierEnableField(productInstanceFunctionId: string): Promise<number>;
  /** Removes a service ID from serviceDisable arrays in products and their modifiers */
  removeServiceDisableFromAll(serviceId: string): Promise<number>;
  /** Migrates printer group for all products */
  migratePrinterGroupForAllProducts(oldId: string, newId: string | null): Promise<number>;
}

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');


