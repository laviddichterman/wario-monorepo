export interface KeyValueEntry {
  key: string;
  value: string;
}

export interface IKeyValueRepository {
  findByKey(key: string): Promise<string | null>;
  findAll(): Promise<KeyValueEntry[]>;
  set(key: string, value: string): Promise<void>;
  setAll(entries: KeyValueEntry[]): Promise<void>;
  delete(key: string): Promise<boolean>;
}

export const KEY_VALUE_REPOSITORY = Symbol('IKeyValueRepository');
