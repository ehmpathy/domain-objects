import { UnexpectedCodePathError } from 'helpful-errors';
import { isPresent } from 'type-fns';

import { RefByPrimary } from '../instantiation/RefByPrimary';
import { Ref } from './Ref.type';
import { DomainObjectShape, Refable } from './Refable';

export const isRefByPrimary =
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
  ): ref is RefByPrimary<TDobj, TShape, TPrimary, TUnique> => {
    // get the primary key attributes
    const primaryKeys: readonly string[] = of.primary;
    if (!primaryKeys)
      throw new UnexpectedCodePathError(
        'can not check isRefByPrimary on a dobj which does not declare its .primary keys',
        { dobj: of.name, primaryKeys },
      );

    // check that each key is defined
    const hasMissingKeys = primaryKeys.some(
      (key) => !isPresent((ref as any)[key]),
    );
    if (hasMissingKeys) return false;
    return true;
  };
