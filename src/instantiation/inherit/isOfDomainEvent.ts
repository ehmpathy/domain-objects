import {
  DomainEvent,
  MARK_AS_DOMAIN_EVENT,
} from '@src/instantiation/DomainEvent';

/**
 * .what = checks if an object is an instance of DomainEvent
 * .why = supports cross version compatability evaluation
 */
export const isOfDomainEvent = (obj: unknown): boolean => {
  // Check direct instanceof first (fast path for same-version)
  if (obj instanceof DomainEvent) return true;

  // Check for the marker symbol in the prototype chain (cross-version support)
  let proto = (obj as any)?.constructor;
  while (proto) {
    if (proto[MARK_AS_DOMAIN_EVENT]) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
};
