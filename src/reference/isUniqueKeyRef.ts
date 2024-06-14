import { isPresent } from 'type-fns';

import { UnexpectedCodePathError } from '../utils/errors/UnexpectedCodePathError';
import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';
import { DomainObjectShape, Refable } from './DomainReferenceable';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';
import { isPrimaryKeyRef } from './isPrimaryKeyRef';

export const isUniqueKeyRef =
  <
    TDobj extends Refable<TShape, TPrimary, TUnique>,
    TShape extends DomainObjectShape = any,
    TPrimary extends readonly string[] = any,
    TUnique extends readonly string[] = any,
  >({
    of,
  }: {
    of: TDobj;
  }) =>
  (
    ref:
      | DomainPrimaryKeyShape<TDobj, TShape, TPrimary, TUnique>
      | DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique>,
  ): ref is DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique> => {
    // get the primary key attributes
    const uniqueKeys: readonly string[] = of.unique;
    if (!uniqueKeys)
      throw new UnexpectedCodePathError(
        'can not check isUniqueKeyRef on a dobj which does not declare its .unique keys',
        { dobj: of.name, uniqueKeys },
      );

    // check that each key is defined
    const hasMissingKeys = uniqueKeys.some(
      (key) => !isPresent((ref as any)[key]),
    );
    if (hasMissingKeys) return false;
    return true;
  };
