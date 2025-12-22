export const BigIntStringify = (str: unknown) =>
  JSON.stringify(
    str,
    (_, value): unknown => (typeof value === 'bigint' ? value.toString() : value), // return everything else unchanged
  );

export const IsSetOfUniqueStrings = (arr: string[]) => new Set(arr).size === arr.length;
