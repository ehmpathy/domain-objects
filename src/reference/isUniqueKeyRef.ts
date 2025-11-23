import { UnexpectedCodePathError } from 'helpful-errors';
import { isPresent } from 'type-fns';

import { DomainReference } from './DomainReference';
import { DomainObjectShape, Refable } from './DomainReferenceable';
import { DomainUniqueKeyShape } from './DomainUniqueKeyShape';

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
    ref: DomainReference<
      Refable<TShape, any, any>, // refable<TShape, any, any> to ensure even unclassed .getReferenceTo usage can use this
      TShape,
      TPrimary,
      TUnique
    >,
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

export const isRefByUnique = isUniqueKeyRef; // alias
