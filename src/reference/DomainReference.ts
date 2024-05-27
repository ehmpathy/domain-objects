import { PickOne } from 'type-fns';

import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';
import { DomainObjectShape, Refable } from './DomainReferenceable';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';

/**
 * declares a reference to a domain.entity or a domain.event
 */
export type DomainReference<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = {
  /**
   * the name of the domain object this is a reference to, if provided
   *
   * note
   * - this will be automatically specified if using `getRef`
   */
  of?: string;
} & PickOne<{
  byPrimary: Required<DomainPrimaryKeyShape<TDobj, TShape, TPrimary, TUnique>>;
  byUnique: DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique>;
}>;

export {
  // expose an alias for easier grokability
  DomainReference as Ref,
};
