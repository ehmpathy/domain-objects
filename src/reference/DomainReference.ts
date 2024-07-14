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
> =
  | {
      /**
       * the name of the domain object this is a reference to, if provided
       *
       * note
       * - this will be automatically specified if using `getRef`
       */
      _dobj?: string;

      /**
       * the type of reference that this is, if provided
       *
       * note
       * - this will be automatically specified if using `getRef`
       */
      // _ref?: 'primary' | 'unique'; // todo: think through how we can enforce its presence... e.g., via a getter?
    } & (
      | (Required<DomainPrimaryKeyShape<TDobj, TShape, TPrimary, TUnique>> & {
          // _ref?: 'primary'; // todo: think through how we can enforce its presence... e.g., via a getter?
        })
      | (DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique> & {
          // _ref?: 'unique'; // todo: think through how we can enforce its presence... e.g., via a getter?
        })
    );

export {
  // expose an alias for easier grokability
  DomainReference as Ref,
};
