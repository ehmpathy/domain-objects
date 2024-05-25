import { getUniqueIdentifier } from '../manipulation/getUniqueIdentifier';
import { DomainReference } from './DomainReference';
import { DomainObjectShape, Refable } from './DomainReferenceable';

/**
 * declares a reference to a domain.entity or domain.event
 *
 * note
 * - if the shape of the unique and primary keys are not resolved, please manually annotate the type
 *   - e.g., `const ref = getRef<typeof SeaTurtle>(turtle)` instead of `const ref = getRef(turtle)`
 *   - automatic resolution of the relationship between instance and class.static properties is still a todo
 */
export const getReferenceTo = <
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any, // todo: update DomainObjectShape -> DomainReferenceableInstance to enable extraction of primary and unique keys via types
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
>(
  // dobj: TShape,
  dobj: TShape,
): DomainReference<TDobj> => {
  return {
    of: dobj.constructor.name,
    byUnique: getUniqueIdentifier(dobj) as any, // always prefer unique identifier, since its the most useable
  };
};

export {
  // export an alias
  getReferenceTo as getRef,
};
