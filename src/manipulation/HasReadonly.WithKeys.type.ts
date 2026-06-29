/**
 * the `WithKeys*` family — narrows an instance type so the given keys / dot-paths are required.
 *
 * these are generic key-requirement operators with no domain dependency; the *caller* decides what the
 * keys mean (here, `HasReadonly` feeds them the readonly keys).
 *
 * - WithKeysFlat: flat (non-dotted) keys
 * - WithKeysDeep: deep (dot-path) keys
 * - WithKeys: both flat and deep
 *
 * .todo = these are generic (no readonly dependency); eject them up into `type-fns`.
 *         tracked as a task against type-fns. collocated here (`HasReadonly.WithKeys`) until then,
 *         since `HasReadonly` is currently their only consumer.
 *
 * the generic dot-path utilities (`PathHead`, `PathTail`, `RequiredAtPaths`) live here for the same reason.
 */

// --- generic dot-path utilities (pure string + object key manipulation) ---

/**
 * the head segment of a dot-path (e.g. `network` of `network.interface.privateIp`)
 */
type PathHead<TPaths extends string> = TPaths extends `${infer H}.${string}`
  ? H
  : TPaths;

/**
 * the tail of a dot-path for a given head (e.g. `interface.privateIp` of `network.interface.privateIp` for head `network`)
 */
type PathTail<
  THead extends string,
  TPaths extends string,
> = TPaths extends `${THead}.${infer Rest}` ? Rest : never;

/**
 * builds an overlay type that marks the object fields targeted by the given dot-paths as required (and non-undefined), deeply
 *
 * - terminal segment => the field becomes required + non-undefined
 * - non-terminal segment => recurse into the field (array element type when the field is an array)
 * - only keys that are heads of a path appear in the overlay
 *
 * this overlay is intended to be intersected with the source type (`T & RequiredAtPaths<T, …>`), so the result
 * stays provably assignable to the source type (an intersection is a subtype of each member).
 */
type RequiredAtPaths<T, TPaths extends string> = {
  [K in keyof T as Extract<K, string> extends PathHead<TPaths>
    ? K
    : never]-?: PathTail<Extract<K, string>, TPaths> extends never
    ? NonNullable<T[K]>
    : NonNullable<T[K]> extends readonly (infer U)[]
      ? Array<U & RequiredAtPaths<U, PathTail<Extract<K, string>, TPaths>>>
      : NonNullable<T[K]> &
          RequiredAtPaths<
            NonNullable<T[K]>,
            PathTail<Extract<K, string>, TPaths>
          >;
};

// --- key-requirement application types ---

/**
 * narrows an instance type so the given flat (non-dotted) keys are required
 */
export type WithKeysFlat<TInstance extends Record<string, any>, TKeysFlat> = [
  TKeysFlat,
] extends [never]
  ? TInstance // no flat keys to apply
  : TInstance & Required<Pick<TInstance, keyof TInstance & TKeysFlat>>;

/**
 * narrows an instance type so the given deep (dot-path) keys are required, via intersection overlay
 */
export type WithKeysDeep<TInstance, TKeysDeep extends string> = [
  TKeysDeep,
] extends [never]
  ? TInstance // no deep keys to apply
  : TInstance & RequiredAtPaths<TInstance, TKeysDeep>;

/**
 * narrows an instance type so both the given flat and deep keys are required
 */
export type WithKeys<
  TInstance extends Record<string, any>,
  TKeysFlat,
  TKeysDeep extends string,
> = WithKeysDeep<WithKeysFlat<TInstance, TKeysFlat>, TKeysDeep>;
