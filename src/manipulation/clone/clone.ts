import type { DomainObject } from '@src/instantiation/DomainObject';

// todo: expose via type-fns
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/**
 * .what = deep clones domain objects safely
 * .why = preserves instance types, methods, and nested structures
 */
export const clone = <T extends DomainObject<any>>(
  dobj: T,
  updates: DeepPartial<T> = {},
): T => {
  // clone and merge
  const merged = deepMerge(deepClone(dobj), updates);

  // instantiate, if can
  const ctor = dobj?.constructor;
  const hasConstructor =
    typeof ctor === 'function' &&
    ctor !== Object &&
    ctor.prototype &&
    ctor.prototype.constructor === ctor;
  if (!hasConstructor) return merged;
  return new (ctor as new (props: any) => T)(merged);
};

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(deepClone) as any;
  }

  if (value instanceof Date) return new Date(value.getTime()) as any;

  const proto = Object.getPrototypeOf(value);
  const cloneObj = Object.create(proto);

  for (const key of Reflect.ownKeys(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (desc) {
      Object.defineProperty(cloneObj, key, {
        ...desc,
        value: deepClone((value as any)[key]),
      });
    }
  }

  return cloneObj;
}

function deepMerge<T>(base: T, updates: DeepPartial<T>): T {
  const result = Array.isArray(base) ? [...base] : { ...base };

  for (const key in updates) {
    const baseVal = (base as any)[key];
    const updateVal = (updates as any)[key];

    const isMergeableObject =
      typeof baseVal === 'object' &&
      baseVal !== null &&
      typeof updateVal === 'object' &&
      updateVal !== null &&
      !Array.isArray(baseVal) &&
      !Array.isArray(updateVal);

    if (isMergeableObject) {
      (result as any)[key] = deepMerge(baseVal, updateVal);
    } else if (updateVal !== undefined) {
      (result as any)[key] = updateVal;
    }
  }

  return result as T;
}
