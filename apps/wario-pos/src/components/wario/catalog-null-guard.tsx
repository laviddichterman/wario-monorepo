type NullGuardProps<T> = {
  id: string | null;
  child: (value: T) => React.ReactNode;
};

/**
 * Factory function to create type-safe null guards that follow the Rules of Hooks.
 * The hook is captured at creation time, ensuring it's always the same hook on every render.
 *
 * @example
 * // Create at module level:
 * export const PrinterGroupNullGuard = createNullGuard(usePrinterGroupById);
 *
 * // Use in component:
 * <PrinterGroupNullGuard id={printerGroupId} child={(pg) => <Inner printerGroup={pg} />} />
 */
export function createNullGuard<T>(useQuery: (id: string | null) => T | null | undefined) {
  return function NullGuard({ id, child }: NullGuardProps<T>) {
    const value = useQuery(id);
    if (!value) {
      return null;
    }
    return child(value);
  };
}
