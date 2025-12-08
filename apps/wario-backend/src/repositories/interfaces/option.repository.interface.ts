import type { IOption } from '@wcp/wario-shared';

export interface IOptionRepository {
  findById(id: string): Promise<IOption | null>;
  findAll(): Promise<IOption[]>;
  findByModifierTypeId(modifierTypeId: string): Promise<IOption[]>;
  create(option: Omit<IOption, 'id'>): Promise<IOption>;
  update(id: string, partial: Partial<Omit<IOption, 'id'>>): Promise<IOption | null>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  bulkCreate(options: Omit<IOption, 'id'>[]): Promise<IOption[]>;
  bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<IOption, 'id'>> }>): Promise<number>;
  bulkDelete(ids: string[]): Promise<number>;
  deleteByModifierTypeId(modifierTypeId: string): Promise<number>;

  // Enable field operations (for ProductInstanceFunction cascade)
  clearEnableField(productInstanceFunctionId: string): Promise<number>;
}

export const OPTION_REPOSITORY = Symbol('IOptionRepository');

