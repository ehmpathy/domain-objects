import { DomainPrimaryKeys } from './DomainPrimaryKeys';
import { DomainObjectShape, Refable } from './DomainReferenceable';

/**
 * a generic which extracts the unique key shape of a domain object
 */
export type DomainPrimaryKeyShape<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Required<Pick<InstanceType<TDobj>, DomainPrimaryKeys<TDobj>[number]>>;
