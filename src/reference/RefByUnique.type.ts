import type { DomainObjectShape, Refable } from './Refable';
import type { RefKeysUnique } from './RefKeysUnique';

/**
 * .what = type for a reference to a domain object by its unique key
 * .why = extracted to break circular dependencies between instantiation and reference
 * .note = `Required<>` is load-critical, not cosmetic, and it mirrors `RefByPrimary`. a bare `Pick`
 *   inherits optionality from the instance type, so a dobj that declares an OPTIONAL unique-key
 *   field would type a reference whose key may be `undefined` — a reference to nowhere. the same
 *   argument that makes a primary key required at reference time makes a unique key required: a
 *   reference names a real value, or it names none.
 *   ⚠️ narrowed from a bare `Pick` deliberately, to align the three surfaces that describe ONE
 *   unique reference — this type, `refByUnique` (which throws on an undefined key value), and
 *   `X.contract().ref('unique')` (whose pick is `.required()`). they disagreed, and a disagreement
 *   among them is exactly how a ref-to-nowhere passes one surface while another calls it valid
 *   (`rule.forbid.failhide`). clamped by table F in `getContractRef.matrix.test.ts`.
 */
export type RefByUnique<
  TDobj extends Refable<TShape, TPrimary, TUnique>,
  TShape extends DomainObjectShape = any,
  TPrimary extends readonly string[] = any,
  TUnique extends readonly string[] = any,
> = Required<Pick<InstanceType<TDobj>, RefKeysUnique<TDobj>[number]>>;
