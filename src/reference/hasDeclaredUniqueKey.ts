/**
 * .what = does a domain object class declare `static unique` key(s)?
 * .why =
 *   two independent graph walks decide "recurse into this nested dobj's own unique ref" off the
 *   same fact: `refByUnique` (walks live instance values) and `buildKeyContract` (walks schema
 *   shapes). they once drifted on the *condition* that gates that recursion. this one predicate is
 *   the single source of truth for that gate, so the two walks cannot silently diverge on it.
 * .note = accepts a nullish class so callers can pass `value.constructor` directly (a live value's
 *   constructor may be absent); a class with no `static unique` and a nullish class both read false.
 * .note = ⚠️ an EMPTY array reads false, and the length check is load-critical rather than tidy.
 *   `[]` is truthy, so a bare `!!dobjClass?.unique` reported "yes, it declares a unique key" for a
 *   `static unique = []`, and every downstream reader then produced a reference that names no key:
 *   `refByUnique(instance)` returned `{}`, and `.contract().ref('unique')` picked an empty object —
 *   a success verdict on a reference to nowhere (`rule.forbid.failhide`).
 *   this is q24's own principle, one declaration over: a reference that names no key is not a
 *   reference. `.ref()` already refuses to hand back `{}` for a payload with no key value; a dobj
 *   that declares no key value to name is the same fact, at declaration time rather than parse time.
 * .note = ⚠️ this changes behavior on PRIOR public api, not merely on the new surface. a
 *   `refByUnique(x)` where `x.constructor.unique === []` used to return `{}` and now raises the same
 *   named error an absent `static unique` raises. that is deliberate: `{}` was never a usable
 *   reference, and a caller who received one had a bug that reported itself as a success. the
 *   declaration is degenerate by construction (`DomainEntity.primary` is a `readonly [string]` tuple
 *   and cannot be empty at all), so the reach is a dobj that opted into the vacuous form on purpose.
 */
export const hasDeclaredUniqueKey = (
  dobjClass: { unique?: readonly string[] } | undefined | null,
): boolean => !!dobjClass?.unique && dobjClass.unique.length > 0;
