import { PickOne } from 'type-fns';

import { DomainKeyPrimary } from './DomainKeyPrimary';
import { DomainKeyUnique } from './DomainKeyUnique';
import { Refable } from './DomainReferenceable';

/**
 * declares a reference to a domain.entity or a domain.event
 */
export type DomainReference<TDobj extends Refable<any, any, any>> = {
  /**
   * the name of the domain object this is a reference to, if provided
   *
   * note
   * - this will be automatically specified if using `getRef`
   */
  of?: string;
} & PickOne<{
  byPrimary: Required<
    Pick<
      InstanceType<TDobj>,
      // @ts-expect-error // todo: update the DomainEntity.primary key definition to be keyof T; https://github.com/microsoft/TypeScript/issues/32211
      DomainKeyPrimary<TDobj>[number]
    >
  >;
  byUnique: Pick<
    InstanceType<TDobj>,
    // @ts-expect-error // todo: update the DomainEntity.unique key definition to be keyof T; https://github.com/microsoft/TypeScript/issues/32211
    DomainKeyUnique<TDobj>[number]
  >;
}>;

export {
  // expose an alias for easier grokability
  DomainReference as Ref,
};
