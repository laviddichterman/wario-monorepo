import type { IOptionType } from '@wcp/wario-shared';

export interface IOptionTypeRepository {
  findById(id: string): Promise<IOptionType | null>;
  findAll(): Promise<IOptionType[]>;
  create(optionType: Omit<IOptionType, 'id'>): Promise<IOptionType>;
  update(id: string, partial: Partial<Omit<IOptionType, 'id'>>): Promise<IOptionType | null>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  bulkCreate(optionTypes: Omit<IOptionType, 'id'>[]): Promise<IOptionType[]>;
  bulkUpdate(updates: { id: string; data: Partial<Omit<IOptionType, 'id'>> }[]): Promise<number>;
}

export const OPTION_TYPE_REPOSITORY = Symbol('IOptionTypeRepository');
