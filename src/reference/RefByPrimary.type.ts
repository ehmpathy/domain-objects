import type { DomainObjectShape, Refable } from './Refable';
import type { RefKeysPrimary } from './RefKeysPrimary';

/**
 * .what = type for a reference to a domain object by its primary key
 * .why = extracted to break circular dependencies between instantiation and reference
 */
export type RefByPrimary<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Required<Pick<InstanceType<TDobj>, RefKeysPrimary<TDobj>[number]>>;
