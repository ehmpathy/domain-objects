import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';
import { clone } from '@src/manipulation/clone/clone';

/**
 * .what = wrappers which add immutability mechs on dobj instances
 */
export type WithImmute<T> = T & {
  clone(updates?: Partial<T>): WithImmute<T>;
  // future: without(...), merge(...), etc.
};

/**
 * .what = applies withImmute to a single object only (shallow)
 * .why = original behavior, available when recursive is not needed
 * .note = idempotent: safe to call multiple times on same object
 */
const singular = <T extends Record<string, any>>(obj: T): WithImmute<T> => {
  // skip if already has .clone() (idempotent)
  if ('clone' in obj) return obj as WithImmute<T>;

  Object.defineProperty(obj, 'clone', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (updates: Partial<T>) => withImmute(clone(obj, updates)),
  });
  return obj as WithImmute<T>;
};

/**
 * .what = applies withImmute to all domain objects in a value tree
 * .why = ensures nested domain objects also receive .clone()
 */
const recursive = <T>(value: T): WithImmute<T> => {
  // apply to domain objects
  if (isOfDomainObject(value)) {
    singular(value as Record<string, any>);
    // recurse into properties for nested domain objects
    Object.keys(value as object).forEach((key) => {
      recursive((value as Record<string, any>)[key]);
    });
    return value as WithImmute<T>;
  }
  // recurse into arrays
  if (Array.isArray(value)) {
    value.forEach(recursive);
    return value as WithImmute<T>;
  }
  // recurse into plain objects
  if (typeof value === 'object' && value !== null) {
    Object.keys(value).forEach((key) => {
      recursive((value as Record<string, any>)[key]);
    });
  }
  return value as WithImmute<T>;
};

/**
 * .what = adds immute operations (.clone) to domain objects
 * .why = enables immutable updates for safer, more maintainable code
 *
 * variants:
 * - withImmute(value) = recursive (default, pit of success)
 * - withImmute.recursive(value) = explicit recursive
 * - withImmute.singular(obj) = single object only (shallow)
 */
export const withImmute = Object.assign(recursive, { recursive, singular });

/**
 * .what = alias for withImmute
 * .why = intuitive name for what it does (adds .clone())
 */
export const withClone = withImmute;
