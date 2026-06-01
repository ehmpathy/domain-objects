import { MARK_AS_DOMAIN_OBJECT } from '@src/instantiation/markers';

/**
 * .what = checks if input is a DomainObject (class or instance)
 * .why = supports cross version compatibility evaluation
 * .note = uses marker symbol for cycle-free detection
 * .note = static property lookup follows prototype chain automatically in JS
 */
export const isOfDomainObject = (input: unknown): boolean => {
  if (typeof input === 'function') {
    // class: check marker directly
    return (input as any)?.[MARK_AS_DOMAIN_OBJECT] !== undefined;
  }
  // instance: check via constructor
  return (input as any)?.constructor?.[MARK_AS_DOMAIN_OBJECT] !== undefined;
};
