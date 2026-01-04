import {
  DomainObject,
  MARK_AS_DOMAIN_OBJECT,
} from '@src/instantiation/DomainObject';

/**
 * .what = checks if an object is an instance of DomainObject
 * .why = supports cross version compatability evaluation
 */
export const isOfDomainObject = (obj: unknown): boolean => {
  // Check direct instanceof first (fast path for same-version)
  if (obj instanceof DomainObject) return true;

  // Check for the marker symbol in the prototype chain (cross-version support)
  let proto = (obj as any)?.constructor;
  while (proto) {
    if (proto[MARK_AS_DOMAIN_OBJECT]) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
};
