import { UnexpectedCodePathError } from 'helpful-errors';
import { isPresent } from 'type-fns';

import { RefByUnique } from '../instantiation/RefByUnique';
import { Ref } from './Ref.type';
import { DomainObjectShape, Refable } from './Refable';

export const isRefByUnique =
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
    ref: Ref<
      Refable<TShape, any, any>, // refable<TShape, any, any> to ensure even unclassed .getReferenceTo usage can use this
      TShape,
      TPrimary,
      TUnique
    >,
  ): ref is RefByUnique<TDobj, TShape, TPrimary, TUnique> => {
    // get the unique key attributes
    const uniqueKeys: readonly string[] = of.unique;
    if (!uniqueKeys)
      throw new UnexpectedCodePathError(
        'can not check isRefByUnique on a dobj which does not declare its .unique keys',
        { dobj: of.name, uniqueKeys },
      );

    // check that each key is defined
    const hasMissingKeys = uniqueKeys.some(
      (key) => !isPresent((ref as any)[key]),
    );
    if (hasMissingKeys) return false;
    return true;
  };
