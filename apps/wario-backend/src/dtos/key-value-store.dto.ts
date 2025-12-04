/**
 * DTO for updating key-value configuration store
 * Expects a flat object with string keys and string values
 * Example: { "key1": "value1", "key2": "value2" }
 */
export type KeyValueConfigDto = Record<string, string>;

