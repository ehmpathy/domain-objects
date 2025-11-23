import { RefKeysUnique } from './RefKeysUnique';
import { DomainObjectShape, Refable } from './Refable';

/**
 * a generic which extracts the unique key shape of a domain object
 */
export type RefByUnique<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Pick<InstanceType<TDobj>, RefKeysUnique<TDobj>[number]>;
