import type { DomainObjectShape } from '@src/instantiation/DomainObjectShape';

export type { DomainObjectShape } from '@src/instantiation/DomainObjectShape';

/**
 * .what = the static-side shape of a domain object class that can be referenced by key
 * .why = `Ref` / `RefByPrimary` / `RefByUnique` all derive their key names from `primary` /
 *   `unique`, which are class STATICS — so the constraint must name the class, not the instance
 * .note = declared structurally rather than as `typeof DomainEntity | typeof DomainEvent`, to keep
 *   `reference/` free of any edge back into `instantiation/` — the same cycle break that
 *   `DomainObjectShape` and `RefByPrimary.type` record. an extends of those two classes named only
 *   their INSTANCE types (which declare no members at all), so it constrained no member while it
 *   closed a cycle: `Refable` → `DomainEntity` → `DomainObject` → `getContract` → `Refable`.
 */
export interface Refable<
  TShape extends DomainObjectShape,
  TPrimary extends readonly string[],
  TUnique extends readonly string[],
> {
  new (props: TShape): TShape;
  primary: TPrimary;
  unique: TUnique;
}
