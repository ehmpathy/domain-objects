import { PickOne } from 'type-fns';

import { DomainObjectShape, Refable } from '../DomainReferenceable';

/**
 * .what = a unique key declared in pivot notation, for max(observability), when applicable
 * .what.examples
 *   - if: RefByUnique<Payer> === { role: PayerRole, exid: string }
 *   - ->: RefByPivot<Payer, 'role', 'exid'> === { [key: PayerRole]: string }
 *   - if: RefByUnique<Participant> === { role: ParticipantRole, exid: string }
 *   - ->: RefByPivot<Participant, 'role', 'exid'> === { [key: ParticipantRole]: string }
 *
 * todo: have the pivot key auto defined via `[$1, $2]` notation on the dobj?
 */
export type DomainPivotKeyShape<
  TDobj extends DomainObjectShape,
  TPivotKey extends keyof TDobj,
  TPivotValue extends keyof TDobj,
> = PickOne<Record<TDobj[TPivotKey], TDobj[TPivotValue]>>;

export {
  DomainPivotKeyShape as DomainReferenceByPivotKey,
  DomainPivotKeyShape as RefByPivot,
};
