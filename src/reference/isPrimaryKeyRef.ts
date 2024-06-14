import { isPresent } from 'type-fns';

import { UnexpectedCodePathError } from '../utils/errors/UnexpectedCodePathError';
import { DomainPrimaryKeyShape } from './DomainPrimaryKeyShape';
import { DomainObjectShape, Refable } from './DomainReferenceable';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';

export const isPrimaryKeyRef =
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
  ): ref is DomainPrimaryKeyShape<TDobj, TShape, TPrimary, TUnique> => {
    // get the primary key attributes
    const primaryKeys: readonly string[] = of.primary;
    if (!primaryKeys)
      throw new UnexpectedCodePathError(
        'can not check isPrimaryKeyRef on a dobj which does not declare its .primary keys',
        { dobj: of.name, primaryKeys },
      );

    // check that each key is defined
    const hasMissingKeys = primaryKeys.some(
      (key) => !isPresent((ref as any)[key]),
    );
    if (hasMissingKeys) return false;
    return true;
  };
