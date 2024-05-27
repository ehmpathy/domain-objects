import { DomainObjectShape, Refable } from './DomainReferenceable';

/**
 * a generic which extracts the primary keys of a domain object
 */
export type DomainPrimaryKeys<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = TDobj['primary'];
