import { DomainObjectShape, Refable } from './DomainReferenceable';

/**
 * a generic which extracts the unique keys of a domain object
 *
 * note
 * - domain.literals are unique on their full identity and so have no unique key, only their full definition
 */
export type DomainUniqueKeys<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = TDobj['unique'];

export { DomainUniqueKeys as RefKeysUnique };
