import type { HasMetadata } from 'type-fns';

/**
 * extracts the metadata keys from a DomainObject class, if explicitly declared
 *
 * returns the literal tuple element union if metadata is declared with `as const`,
 * otherwise returns `never` to signal that defaults should be used
 */
type ExplicitMetadataKeysOf<TDobj> = TDobj extends { metadata: infer M }
  ? M extends readonly string[]
    ? // Check if metadata is a literal tuple (not just readonly string[])
      string extends M[number]
      ? never // type is too wide, use defaults
      : M[number]
    : never
  : never;

/**
 * applies metadata key requirements on top of an instance type
 *
 * - if metadata is explicitly declared on the class (as const), requires those keys
 * - otherwise, uses the default metadata keys from HasMetadata (id, uuid, createdAt, updatedAt, effectiveAt)
 */
export type WithMetadata<TDobj, TInstance extends Record<string, any>> = [
  ExplicitMetadataKeysOf<TDobj>,
] extends [never]
  ? HasMetadata<TInstance> // use defaults from HasMetadata
  : HasMetadata<TInstance, ExplicitMetadataKeysOf<TDobj> & string>;
