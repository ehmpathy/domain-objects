/**
 * type-level operators that extract the readonly keys declared on a DomainObject class.
 *
 * the type-level mirror of the runtime `getReadonlyKeys`:
 * - GetReadonlyKeysOf: all readonly keys (flat + deep)
 * - GetReadonlyKeysFlatOf: the flat (non-dotted) subset
 * - GetReadonlyKeysDeepOf: the deep (dotted, e.g. `network.interface.privateIp`) subset
 */

/**
 * extracts the readonly keys from a DomainEntity class
 *
 * if readonly is explicitly declared on the class (as const), uses those keys
 * otherwise, there are no readonly keys (empty union = never)
 */
export type GetReadonlyKeysOf<TDobj> = TDobj extends { readonly: infer R }
  ? R extends readonly string[]
    ? // Check if readonly is a literal tuple (not just readonly string[])
      string extends R[number]
      ? never // no default readonly keys
      : R[number]
    : never
  : never;

/**
 * extracts the flat (non-dotted) subset of readonly keys
 */
export type GetReadonlyKeysFlatOf<TDobj> = Exclude<
  GetReadonlyKeysOf<TDobj>,
  `${string}.${string}`
>;

/**
 * extracts the deep (dotted, e.g. `network.interface.privateIp`) subset of readonly keys
 */
export type GetReadonlyKeysDeepOf<TDobj> = Extract<
  GetReadonlyKeysOf<TDobj>,
  `${string}.${string}`
>;
