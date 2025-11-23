import { clone } from '../clone/clone';

/**
 * .what = wrappers which add immutability mechs on dobj instances
 */
export type WithImmute<T> = T & {
  clone(updates?: Partial<T>): WithImmute<T>;
  // future: without(...), merge(...), etc.
};

export function withClone<T extends Record<string, any>>(
  obj: T,
): WithImmute<T> {
  Object.defineProperty(obj, 'clone', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (updates: Partial<T>) => withImmute(clone(obj, updates)),
  });

  return obj as WithImmute<T>;
}

export function withImmute<T extends Record<string, any>>(
  obj: T,
): WithImmute<T> {
  return withClone(obj);
}
