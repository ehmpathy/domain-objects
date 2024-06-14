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
  ): ref is DomainUniqueKeyShape<TDobj, TShape, TPrimary, TUnique> =>
    !isPrimaryKeyRef({ of })(ref); // !: for now, if not primary key, then  it is a unique key, since the input is constrained to the two
