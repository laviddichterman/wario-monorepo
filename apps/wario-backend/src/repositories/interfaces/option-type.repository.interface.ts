import type { IOptionType } from '@wcp/wario-shared';

export interface IOptionTypeRepository {
  findById(id: string): Promise<IOptionType | null>;
  findAll(): Promise<IOptionType[]>;
  save(optionType: Omit<IOptionType, 'id'> & { id?: string }): Promise<IOptionType>;
  delete(id: string): Promise<boolean>;
}

export const OPTION_TYPE_REPOSITORY = Symbol('IOptionTypeRepository');
