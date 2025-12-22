/**
 * Mongoose to Entity Conversion Utilities
 *
 * These helpers strip Mongoose internal fields (_id, __v) from lean documents
 * when converting to domain entities. This prevents issues when spreading
 * domain objects into update operations.
 */

/**
 * Mongoose document type with internal fields
 */
interface MongooseDoc {
  _id: { toString(): string } | string;
  __v?: unknown;
}

/**
 * Convert a Mongoose lean document to a domain entity.
 * Strips _id and __v, and adds `id` from _id.toString().
 *
 * @param doc - The Mongoose lean document
 * @returns The domain entity with `id` field and without Mongoose internals
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is used for return type casting
export function toEntity<T extends { id: string }>(doc: MongooseDoc): T {
  const { _id, __v, ...rest } = doc as MongooseDoc & Record<string, unknown>;
  const result: T = { ...rest, id: typeof _id === 'string' ? _id : _id.toString() } as T;
  return result;
}
