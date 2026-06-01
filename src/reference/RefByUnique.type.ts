import type { DomainObjectShape, Refable } from './Refable';
import type { RefKeysUnique } from './RefKeysUnique';

/**
 * .what = type for a reference to a domain object by its unique key
 * .why = extracted to break circular dependencies between instantiation and reference
 */
export type RefByUnique<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Pick<InstanceType<TDobj>, RefKeysUnique<TDobj>[number]>;
