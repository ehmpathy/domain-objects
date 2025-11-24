import { DomainEntity, MARK_AS_DOMAIN_ENTITY } from '../DomainEntity';

/**
 * .what = checks if an object is an instance of DomainEntity
 * .why = supports cross version compatability evaluation
 */
export const isOfDomainEntity = (obj: unknown): boolean => {
  // Check direct instanceof first (fast path for same-version)
  if (obj instanceof DomainEntity) return true;

  // Check for the marker symbol in the prototype chain (cross-version support)
  let proto = (obj as any)?.constructor;
  while (proto) {
    if (proto[MARK_AS_DOMAIN_ENTITY]) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
};
