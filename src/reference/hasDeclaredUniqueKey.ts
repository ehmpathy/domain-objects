/**
 * .what = does a domain object class declare `static unique` key(s)?
 * .why =
 *   two independent graph walks decide "recurse into this nested dobj's own unique ref" off the
 *   same fact: `refByUnique` (walks live instance values) and `buildKeyContract` (walks schema
 *   shapes). they once drifted on the *condition* that gates that recursion. this one predicate is
 *   the single source of truth for that gate, so the two walks cannot silently diverge on it.
 * .note = accepts a nullish class so callers can pass `value.constructor` directly (a live value's
 *   constructor may be absent); a class with no `static unique` and a nullish class both read false.
 */
export const hasDeclaredUniqueKey = (
  dobjClass: { unique?: readonly string[] } | undefined | null,
): boolean => !!dobjClass?.unique;
