export type NullablePartial<T,
  NK extends keyof T = { [K in keyof T]: null extends T[K] ? K : never }[keyof T],
  NP = Partial<Pick<T, NK>> & Pick<T, Exclude<keyof T, NK>>
> = { [K in keyof NP]-?: NP[K] | null };

// export type NestedKeyOf<ObjectType extends object> =
//   { [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
//     ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
//     : `${Key}`
//   }[keyof ObjectType & (string | number)];

/**
 * Infers a type from a given type T. Useful for debugging complex types.
 */
export type InferType<T> = T extends infer O ? { [K in keyof O]: O[K] } : never
/**
 * Omit that distributes over unions
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/**
 * Pick that distributes over unions
 */
export type DistributivePick<T, K extends keyof T> = T extends unknown
  ? Pick<T, K>
  : never

export type NonNullableFields<T> = { [P in keyof T]: NonNullable<T[P]> };

export type Selector<T> = (id: string) => (T | undefined);
export type SelectIds = () => string[];
export interface EntitySelector<T> {
  selectById: Selector<T>;
  selectIds: SelectIds;
};
