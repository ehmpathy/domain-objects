import type { SchemaOptions } from '@src/instantiation/validate/validate';

/**
 * .what = the static-metadata view of a domain object class, by the statics `.contract` /
 *   `.contract.ref` read off the class — never an instance
 * .why =
 *   - typed structurally (not as `typeof DomainObject`) so concrete dobj subclass constructors are
 *     assignable; `typeof DomainObject` has a generic `<T>` construct signature that subclass
 *     constructors do not satisfy
 *   - `primary`/`unique` live on DomainEntity/DomainLiteral, `nested` on DomainObject; all optional
 *   - one shared shape so `getContract` and `getContractRef` cannot silently drift (a new static
 *     added to one view but not the other) — the same hand-sync hazard that caused a real bug once
 * .note = broader than the canonical `DomainObjectConstructor` (which omits these key statics);
 *   both readers read statics only and never instantiate, so neither needs the `new()`/`build`
 *   members of that type
 * .note = `nested` is `Record<string, any>` (not a precise dobj-class type): the value is a nested
 *   dobj *constructor* (or an array of choices), whose type does not fit a static-view shape
 *   cleanly — matches `DomainObject.nested`'s own imprecise type
 * .note = `alias` is optional and read only by `getContract` (it stamps it into `x-domain-object`);
 *   `getContractRef` never reads it (a ref is `{ of, by }`) and simply leaves it untouched. one
 *   shared shape keeps the two readers from drift — a static added here reaches both.
 */
export type DomainObjectClass = {
  name: string;
  schema?: SchemaOptions<any>;
  primary?: readonly string[];
  unique?: readonly string[];
  nested?: Record<string, any>;
  alias?: string | { plural?: string; singular?: string };
};
