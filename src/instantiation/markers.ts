/**
 * .what = marker symbols for domain object type checks
 * .why = extracted to break circular dependencies with isOf* functions
 *
 * uses Symbol.for() for cross-version, global registry
 */
export const MARK_AS_DOMAIN_OBJECT = Symbol.for('domain-objects/DomainObject');
export const MARK_AS_DOMAIN_ENTITY = Symbol.for('domain-objects/DomainEntity');
export const MARK_AS_DOMAIN_EVENT = Symbol.for('domain-objects/DomainEvent');
export const MARK_AS_DOMAIN_LITERAL = Symbol.for(
  'domain-objects/DomainLiteral',
);
