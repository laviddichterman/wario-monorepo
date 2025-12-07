import { type UpdateQuery } from "mongoose";

/**
 * Converts a partial object into a Mongoose UpdateQuery with $set operations.
 * Flattens nested objects into dot-notation to enable true partial updates
 * (e.g., { displayFlags: { is3p: true } } becomes { 'displayFlags.is3p': true })
 * 
 * @param partial - The partial object to convert
 * @returns A Mongoose UpdateQuery with flattened $set operations
 */
export function toPartialUpdateQuery<T extends object>(
  partial: Partial<T>
): UpdateQuery<T> {
  const flattenObject = (
    obj: Record<string, unknown>,
    prefix = ''
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        Object.keys(value).length > 0
      ) {
        // Recursively flatten nested objects
        Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
      } else {
        // Primitive value or array - keep as is
        result[newKey] = value;
      }
    }
    return result;
  };
  const flattened = flattenObject(partial as Record<string, unknown>);

  return { $set: flattened } as UpdateQuery<T>;
}