/**
 * Utility for filtering objects to only include dirty (modified) fields.
 * Used for PATCH requests where we only want to send fields that have changed.
 */

/**
 * Filters an object to only include fields that are marked as dirty.
 * If dirtyFields is undefined or empty, returns the full object (useful for POST/create operations).
 *
 * @param obj - The full object with all fields
 * @param dirtyFields - Set of field names that have been modified
 * @returns Object containing only the dirty fields, or the full object if no dirty tracking
 *
 * @example
 * const fullForm = { name: 'John', age: 30, email: 'john@example.com' };
 * const dirty = new Set(['name', 'age']);
 * const payload = filterToDirtyFields(fullForm, dirty);
 * // Returns: { name: 'John', age: 30 }
 */
export function filterToDirtyFields<T extends Record<string, unknown>>(obj: T, dirtyFields?: Set<keyof T>): Partial<T> {
  // If no dirty tracking, return all fields (e.g., for create/add mode)
  if (!dirtyFields || dirtyFields.size === 0) {
    return obj;
  }

  // Filter to only dirty fields
  return Object.keys(obj).reduce<Partial<T>>((acc, key) => {
    if (dirtyFields.has(key as keyof T)) {
      acc[key as keyof T] = obj[key as keyof T];
    }
    return acc;
  }, {});
}

/**
 * Creates an update field function that automatically tracks dirty fields.
 * This is a helper for creating consistent form field update handlers.
 *
 * @param setForm - Jotai setter for the form state atom
 * @param setDirtyFields - Jotai setter for the dirty fields atom
 * @returns A function that updates a field and marks it as dirty
 *
 * @example
 * const setForm = useSetAtom(formAtom);
 * const setDirtyFields = useSetAtom(formDirtyFieldsAtom);
 * const updateField = createUpdateFieldWithDirtyTracking(setForm, setDirtyFields);
 *
 * // In a form field handler:
 * updateField('displayName', 'New Name');
 */
export function createUpdateFieldWithDirtyTracking<T extends Record<string, unknown>>(
  setForm: (update: (prev: T | null) => T | null) => void,
  setDirtyFields: (update: (prev: Set<keyof T>) => Set<keyof T>) => void,
) {
  return <K extends keyof T>(field: K, value: T[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    setDirtyFields((prev) => new Set(prev).add(field));
  };
}
