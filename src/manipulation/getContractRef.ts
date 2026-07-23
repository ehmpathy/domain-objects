import { ConstraintError } from 'helpful-errors';
import type { ZodSchema } from 'zod';

import { isZodSchema } from '@src/instantiation/validate/validate';
import { hasDeclaredUniqueKey } from '@src/reference/hasDeclaredUniqueKey';

import type { DomainObjectClass } from './DomainObjectClass';
import type { DomainObjectRefBy } from './DomainObjectPragma';

/**
 * .what = the subset of the zod object api getContractRef leans on (instance methods only)
 * .why = the library never imports the `z` value; it derives sub-schemas from the author's schema
 *   instance — exactly how `getContract` stamps via `schema.meta()` without a `z` import
 */
type ZodObjectLike = ZodSchema<any> & {
  shape: Record<string, ZodSchema<any>>;
  pick: (mask: Record<string, true>) => ZodObjectLike;
  extend: (shape: Record<string, ZodSchema<any>>) => ZodObjectLike;
  or: (other: ZodSchema<any>) => ZodSchema<any>;
  meta: (data: Record<string, any>) => ZodSchema<any>;
};

/**
 * .what = per-class, per-`by` memo of the stamped ref contract
 * .why = `.pick()`/`.meta()` return fresh schemas each call; cache so repeated access is idempotent
 *   (same instance back), mirrors `contractByClass` — the vision's pit-of-success contract
 */
const contractRefByClass = new WeakMap<
  DomainObjectClass,
  Map<DomainObjectRefBy, ZodSchema<any>>
>();

/**
 * .what = reads the dobj's static schema; fails fast unless it is a zod *object* schema
 * .why = `.contract.ref` derives key fields via `.pick()`, which only a zod object supports;
 *   the three guards mirror `.contract`'s strictness (no-schema / non-zod), plus an object check
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): zod's `ZodSchema<any>` type does not
 *   surface the object-schema instance methods (`.pick`/`.shape`) to a type-only consumer, so we
 *   probe them at runtime — the two `typeof` guards ARE the type guard that makes the final
 *   `as unknown as ZodObjectLike` sound. removal path: when this lib accepts a typed `z.ZodObject`
 *   argument instead of the schema-agnostic `SchemaOptions`, the probes + cast can be dropped.
 * .note = the no-schema / non-zod guards are near-unreachable on the common path: the sole public
 *   route here is `X.contract.ref(by)`, and `getContract` fail-fasts on both facts before it
 *   attaches `.ref`, so the FIRST `.ref(...)` call never reaches them. they are not strictly dead,
 *   though — `.contract` memoizes on first access while each new `by` re-reads `dobj.schema` fresh,
 *   so a `dobj.schema` mutated after that first access could reach them via the public surface. they
 *   stay to keep this fn sound (incl. a direct, unexported call) and to fail loud with a
 *   `.contract.ref`-specific message; the object-shape guard is the routinely-reachable one.
 */
const getObjectSchemaOrThrow = (dobj: DomainObjectClass): ZodObjectLike => {
  const { schema } = dobj;
  if (!schema)
    throw new ConstraintError(
      `${dobj.name}.contract.ref requires a static schema. declare \`static schema\` (zod) on ${dobj.name} to use .contract.ref`,
      { domainObject: dobj.name },
    );
  if (!isZodSchema(schema))
    throw new ConstraintError(
      `${dobj.name}.contract.ref requires a zod schema; joi/yup cannot carry json-schema identity`,
      { domainObject: dobj.name },
    );
  // runtime probe of the zod-object instance methods (see .note: guards the cast below)
  if (
    typeof (schema as any).pick !== 'function' ||
    typeof (schema as any).shape !== 'object'
  )
    throw new ConstraintError(
      `${dobj.name}.contract.ref requires an object schema (z.object) to derive key fields`,
      { domainObject: dobj.name },
    );
  return schema as unknown as ZodObjectLike;
};

/**
 * .what = the declared key names for a `primary`/`unique` grain; fails fast if absent
 * .why = a ref must name real key fields; an absent `static primary`/`unique` is caller-must-fix
 */
const getKeysOrThrow = (
  dobj: DomainObjectClass,
  by: 'primary' | 'unique',
): readonly string[] => {
  const keys = by === 'primary' ? dobj.primary : dobj.unique;
  if (!keys)
    throw new ConstraintError(
      `${dobj.name}.contract.ref('${by}') requires \`static ${by}\` on ${dobj.name}`,
      { domainObject: dobj.name, by },
    );
  return keys;
};

/**
 * .what = stamps a schema with the `x-domain-object-ref` pragma via zod's `.meta()` registry
 * .why = returns a fresh schema (author's untouched); the stamp rides through `z.toJSONSchema()`
 */
const stampRef = (
  schema: ZodSchema<any>,
  of: string,
  by: DomainObjectRefBy,
): ZodSchema<any> => schema.meta({ 'x-domain-object-ref': { of, by } });

/**
 * .what = guards + flat pick of the declared key fields for a grain (no nested reduction)
 * .why = the trivial half of a key contract: fail loud on an absent key, then pick the key sub-shape.
 *   isolated from the nested-graph reduction so the simple path stays simple and independently testable.
 */
const pickDeclaredKeys = (
  dobj: DomainObjectClass,
  by: 'primary' | 'unique',
): ZodObjectLike => {
  const schema = getObjectSchemaOrThrow(dobj);
  const keys = getKeysOrThrow(dobj, by);
  const { shape } = schema;

  // fail loud if any declared key is absent from the schema (never pick a hole)
  for (const key of keys)
    if (!(key in shape))
      throw new ConstraintError(
        `${dobj.name}.contract.ref('${by}'): key '${key}' is declared in \`static ${by}\` but absent from \`static schema\``,
        { domainObject: dobj.name, by, key },
      );

  // pick only the declared key fields
  return schema.pick(
    Object.fromEntries(keys.map((key): [string, true] => [key, true])),
  );
};

/**
 * .what = reduces each nested-dobj unique key to its own unique ref, atop the flat `picked` base
 * .why = for `unique`, a key that is itself a nested dobj recurses to that dobj's own unique ref —
 *   to match `refByUnique`'s runtime reduction (vision q2). the genuinely-complex half: graph
 *   recursion, cyclic guard, and the polymorphic-arm fail-fast, isolated from the flat pick.
 * .note = `seen` guards a cyclic unique-key graph (A.unique → B, B.unique → A) — fail loud.
 *   the nested recursion goes through `getContractRefSeen` (not a raw build) so a nested dobj's ref
 *   is memoized too — the same instance a direct `Nested.contract.ref('unique')` returns (idempotency).
 */
const reduceNestedUniqueKeys = (
  dobj: DomainObjectClass,
  picked: ZodObjectLike,
  seen: readonly DomainObjectClass[],
): ZodObjectLike => {
  const nested = dobj.nested;
  const keys = dobj.unique ?? [];
  return keys.reduce((acc, key) => {
    const declaration = nested?.[key];
    // a scalar unique key (absent from `nested`) stays a flat pick — matches runtime
    if (!declaration) return acc;

    // a polymorphic (array-of-choices) nested unique key: runtime refByUnique reduces the LIVE
    // instance to whichever arm's own unique ref, so if ANY arm declares `static unique`, the
    // schema cannot know the arm at build time — a flat embed would silently drift from runtime
    // (vision q2). fail loud rather than lie. (a union of each arm's own `.contract.ref('unique')`
    // is the faithful form; deferred as a focused follow-up.) if NO arm declares unique, runtime
    // embeds the whole value for every arm, so the flat pick is faithful — keep it.
    if (Array.isArray(declaration)) {
      const arms: DomainObjectClass[] = declaration;
      const armsWithUnique = arms.filter((Arm) => hasDeclaredUniqueKey(Arm));
      if (armsWithUnique.length)
        throw new ConstraintError(
          `${dobj.name}.contract.ref('unique'): unique key '${key}' is a polymorphic nested dobj (choices: ${arms
            .map((Arm) => Arm.name)
            .join(
              ', ',
            )}); at least one choice declares \`static unique\`, so a single faithful ref sub-shape cannot be derived at schema-build time — runtime refByUnique reduces the live instance to its arm's own unique ref. reference each choice by a single-dobj key instead`,
          { domainObject: dobj.name, by: 'unique', key },
        );
      return acc;
    }

    const NestedDobj: DomainObjectClass = declaration;
    // recurse only when the nested dobj declares its own `static unique` (the gate shared with
    // refByUnique via hasDeclaredUniqueKey); else leave the flat embed of its whole schema (no
    // recursion, no throw) — the normal shape for a DomainLiteral unique key, which declares none
    if (!hasDeclaredUniqueKey(NestedDobj)) return acc;
    // cyclic guard by class reference (not name): two distinct classes that share a name must not
    // false-trip; consistent with `contractRefByClass`, which keys by class reference too
    if (seen.includes(NestedDobj))
      throw new ConstraintError(
        `${dobj.name}.contract.ref('unique'): cyclic unique-key graph via '${key}' → ${NestedDobj.name}`,
        { domainObject: dobj.name, by: 'unique', key, nested: NestedDobj.name },
      );
    // memoized recursion: same stamped instance a direct Nested.contract.ref('unique') returns
    const nestedRef = getContractRefSeen(NestedDobj, 'unique', [...seen, dobj]);
    return acc.extend({ [key]: nestedRef });
  }, picked);
};

/**
 * .what = builds the (unstamped) object schema for one key grain: flat pick, then (for unique)
 *   reduce each nested-dobj key to its own unique ref
 * .why = composes the two halves — `pickDeclaredKeys` (trivial) + `reduceNestedUniqueKeys` (complex)
 *   — so a primary grain (or a unique with no nested keys) is just the flat pick, unchanged
 */
const buildKeyContract = (
  dobj: DomainObjectClass,
  by: 'primary' | 'unique',
  seen: readonly DomainObjectClass[],
): ZodObjectLike => {
  const picked = pickDeclaredKeys(dobj, by);

  // primary (or a unique with no nested keys) → the flat pick is the ref contract
  if (by !== 'unique' || !dobj.nested) return picked;

  // unique → reduce each nested-dobj key to its own unique ref (match runtime refByUnique)
  return reduceNestedUniqueKeys(dobj, picked, seen);
};

/**
 * .what = builds the stamped ref contract for a `by` grain (threads `seen` for the cyclic guard)
 * .why = primary/unique → a stamped key-object; ref → a union of the declared grains, stamped once
 *   at the top (arms unstamped), with a union-of-one degrade to the single declared grain (vision q3)
 */
const buildContractRef = (
  dobj: DomainObjectClass,
  by: DomainObjectRefBy,
  seen: readonly DomainObjectClass[],
): ZodSchema<any> => {
  if (by === 'primary' || by === 'unique')
    return stampRef(buildKeyContract(dobj, by, seen), dobj.name, by);

  // fail loud on any value that is not a declared grain. `DomainObjectRefBy` is a ts-only union,
  // so a js/joi/yup caller can pass an unrecognized `by`; without this guard it would fall through
  // to the 'ref' branch and get relabeled `by: 'ref'` in the output pragma — a silent mislabel.
  // mirrors the fail-fast strictness of every other boundary in this file.
  if (by !== 'ref')
    throw new ConstraintError(
      `${dobj.name}.contract.ref received an unrecognized 'by' value: ${JSON.stringify(
        by,
      )}. expected 'primary' | 'unique' | 'ref'`,
      { domainObject: dobj.name, by },
    );

  // by === 'ref' → union of whichever grains the dobj declares
  const arms: ZodObjectLike[] = [];
  if (dobj.primary) arms.push(buildKeyContract(dobj, 'primary', seen));
  if (dobj.unique) arms.push(buildKeyContract(dobj, 'unique', seen));
  if (arms.length === 0)
    throw new ConstraintError(
      `${dobj.name}.contract.ref('ref') requires at least one of \`static primary\` / \`static unique\` on ${dobj.name}`,
      { domainObject: dobj.name },
    );

  // union-of-one degrades to the single declared grain (no pointless union); else a real union
  const union = arms.length === 1 ? arms[0]! : arms[0]!.or(arms[1]!);
  return stampRef(union, dobj.name, 'ref');
};

/**
 * .what = the memoized, `seen`-threaded core of `getContractRef`
 * .why = memoize per class + per `by` so every access — top-level OR nested-recursive — returns the
 *   SAME stamped instance (the vision's idempotency contract, honored even for nested-dobj refs).
 *   `seen` threads through the build so a nested recursion still guards a cyclic unique-key graph.
 */
const getContractRefSeen = (
  dobj: DomainObjectClass,
  by: DomainObjectRefBy,
  seen: readonly DomainObjectClass[],
): ZodSchema<any> => {
  // return the memoized ref if this class+by was already stamped (idempotent, shared across nests)
  const memoByBy =
    contractRefByClass.get(dobj) ??
    new Map<DomainObjectRefBy, ZodSchema<any>>();
  const memoized = memoByBy.get(by);
  if (memoized) return memoized;

  // build (threads `seen` for the cyclic guard), then memoize per class + per by
  const contractRef = buildContractRef(dobj, by, seen);
  memoByBy.set(by, contractRef);
  contractRefByClass.set(dobj, memoByBy);
  return contractRef;
};

/**
 * .what = returns a dobj's `.contract.ref(by)`: a zod schema of only the referenced key fields,
 *   stamped with an `x-domain-object-ref` pragma so a *reference* survives `z.toJSONSchema()`
 * .why =
 *   - `.contract` embeds the WHOLE dobj (composition); a field that only *names* another dobj by
 *     key needs a smaller, stamped form — this is that form
 *   - lets a cross-service consumer emit a typed `RefBy*<typeof X>` instead of an anonymous shape
 * .note = memoized per class + per `by` (via getContractRefSeen), so repeated access — and any
 *   nested-dobj recursion — returns the same stamped instance
 */
export const getContractRef = (
  dobj: DomainObjectClass,
  by: DomainObjectRefBy,
): ZodSchema<any> => getContractRefSeen(dobj, by, []);
