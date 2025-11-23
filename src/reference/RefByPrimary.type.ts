import { RefKeysPrimary } from './RefKeysPrimary';
import { DomainObjectShape, Refable } from './Refable';

/**
 * a generic which extracts the primary key shape of a domain object
 */
export type RefByPrimary<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Required<Pick<InstanceType<TDobj>, RefKeysPrimary<TDobj>[number]>>;
