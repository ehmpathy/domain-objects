import { ConstraintError } from 'helpful-errors';
import type { ZodSchema } from 'zod';

import {
  isZodSchema,
  isZodSchemaWithMeta,
} from '@src/instantiation/validate/validate';
import { hasDeclaredUniqueKey } from '@src/reference/hasDeclaredUniqueKey';

import { assertKeysInSchemaShape } from './assertKeysInSchemaShape';
import type { DomainObjectClass } from './DomainObjectClass';
import type {
  DomainObjectPragmaRef,
  DomainObjectRefBy,
} from './DomainObjectPragma';

/**
 * .what = the subset of the zod object api getContractRef leans on (instance methods only)
 * .why = the library never imports the `z` value; it derives sub-schemas from the author's schema
 *   instance — exactly how `getContract` stamps via `schema.meta()` without a `z` import
 */
/**
 * .what = the subset of the zod field api this file leans on, atop a plain schema
 * .why = `.nonoptional(params)` is how a required key carries OUR message instead of zod's
 *   `expected nonoptional, received undefined` — see `pickDeclaredKeys`
 */
type ZodFieldLike = ZodSchema<any> & {
  nonoptional: (params?: { error?: string }) => ZodSchema<any>;
};

type ZodObjectLike = ZodSchema<any> & {
  shape: Record<string, ZodFieldLike>;
  pick: (mask: Record<string, true>) => ZodObjectLike;
  extend: (shape: Record<string, ZodSchema<any>>) => ZodObjectLike;
  or: (other: ZodSchema<any>) => ZodSchema<any>;
  meta: (data: Record<string, any>) => ZodSchema<any>;
  required: () => ZodObjectLike;
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
 * .why = `.contract().ref` derives key fields via `.pick()`, which only a zod object supports;
 *   the three guards mirror `.contract()`'s strictness (no-schema / non-zod), plus an object check
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): zod's `ZodSchema<any>` type does not
 *   surface the object-schema instance methods (`.pick`/`.shape`) to a type-only consumer, so we
 *   probe them at runtime — the two `typeof` guards ARE the type guard that makes the final
 *   `as unknown as ZodObjectLike` sound. removal path: when this lib accepts a typed `z.ZodObject`
 *   argument instead of the schema-agnostic `SchemaOptions`, the probes + cast can be dropped.
 * .note = ⚠️ ALL FOUR guards are now near-unreachable on the common path, not merely the first
 *   three. `getContract` gained its own object-shape demand once a scalar `static schema` was
 *   measured to corrupt silently through the coerce, so a non-object schema is refused one step
 *   earlier and this probe never sees it. they are kept regardless, for the same reason the first
 *   three were: this fn is called from `buildKeyContract`'s NESTED recursion too, where the nested
 *   dobj has met no `getContract` guard of its own — so the reachability argument holds for the
 *   top-level entry only. a guard removed on a "cannot happen at the entry" argument would reopen
 *   at the recursion.
 * .note = the no-schema / non-zod guards are near-unreachable on the common path: the sole public
 *   route here is `X.contract().ref(by)`, and `getContract` fail-fasts on both facts before it
 *   attaches `.ref`, so the FIRST `.ref(...)` call never reaches them. they are not strictly dead,
 *   though — `.contract()` memoizes on first call while each new `by` re-reads `dobj.schema` fresh,
 *   so a `dobj.schema` mutated after that first call could reach them via the public surface. they
 *   stay to keep this fn sound (incl. a direct, unexported call) and to fail loud with a
 *   `.contract().ref`-specific message; the object-shape guard is the routinely-reachable one.
 * .note = ⚠️ the first three guards duplicate `getContract`'s own no-schema / non-zod / pre-v4
 *   checks, and the duplication is DELIBERATE per `rule.prefer.wet-over-dry`: two usages, so
 *   copy-paste plus this note. what varies is not incidental — each message names the surface the
 *   caller actually reached (`.contract()` vs `.contract().ref`), which is what makes it a fix
 *   rather than a symptom (`rule.require.errors-name-the-fix`). a shared
 *   `getZodSchemaOrThrow(dobj, label)` would thread that label through as a parameter and buy little
 *   at two callers. extract at the THIRD CALLER — which a new `.contract()` accessor would create —
 *   not before. ⚠️ a third CONDITION on the same two callers (as the v4 probe just was) is not that
 *   trigger; the count that matters is callers, not clauses.
 */
const getObjectSchemaOrThrow = (dobj: DomainObjectClass): ZodObjectLike => {
  const { schema } = dobj;
  if (!schema)
    throw new ConstraintError(
      `${dobj.name}.contract().ref requires a static schema. declare \`static schema\` (zod) on ${dobj.name} to use .contract().ref`,
      { domainObject: dobj.name },
    );
  if (!isZodSchema(schema))
    throw new ConstraintError(
      `${dobj.name}.contract().ref requires a zod schema; joi/yup cannot carry json-schema identity`,
      { domainObject: dobj.name },
    );
  // fail fast on zod v3: `isZodSchema` duck-types on `.safeParse`, which v3 exposes too, so without
  // this a v3 schema reaches `stampRef`'s `.meta()` and throws a raw, unguided TypeError
  if (!isZodSchemaWithMeta(schema))
    throw new ConstraintError(
      `${dobj.name}.contract().ref requires zod v4+; the declared schema has no \`.meta()\`, which the x-domain-object-ref pragma is stamped through`,
      { domainObject: dobj.name },
    );
  // runtime probe of the zod-object instance methods (see .note: guards the cast below)
  if (
    typeof (schema as any).pick !== 'function' ||
    typeof (schema as any).shape !== 'object'
  )
    throw new ConstraintError(
      `${dobj.name}.contract().ref requires an object schema (z.object) to derive key fields`,
      { domainObject: dobj.name },
    );
  return schema as unknown as ZodObjectLike;
};

/**
 * .what = the declared key names for a `primary`/`unique` grain; fails fast if absent OR empty
 * .why = a ref must name real key fields; an absent `static primary`/`unique` is caller-must-fix
 * .note = ⚠️ an EMPTY declaration fails the same way an absent one does. `[]` is truthy, so a bare
 *   `!keys` let `static unique = []` through, `pickDeclaredKeys` picked an empty object, and
 *   `.ref('unique')` reported success on a reference that names no key — the q24 failhide, reached
 *   through the declaration rather than through the payload (`rule.forbid.failhide`).
 *   the `unique` half reads through `hasDeclaredUniqueKey`, the single source of truth two graph
 *   walks already share; `primary` is checked inline because it has no such shared reader (it never
 *   recurses). the two conditions are one fact stated once per grain, not a duplicated guard.
 */
const getKeysOrThrow = (
  dobj: DomainObjectClass,
  by: 'primary' | 'unique',
): readonly string[] => {
  const keys = by === 'primary' ? dobj.primary : dobj.unique;
  const declared =
    by === 'primary' ? !!keys && keys.length > 0 : hasDeclaredUniqueKey(dobj);
  if (!declared || !keys)
    throw new ConstraintError(
      `${dobj.name}.contract().ref('${by}') requires \`static ${by}\` on ${dobj.name} to name at least one key field`,
      { domainObject: dobj.name, by, keys },
    );
  return keys;
};

/**
 * .what = stamps a schema with the `x-domain-object-ref` pragma via zod's `.meta()` registry
 * .why = returns a fresh schema (author's untouched); the stamp rides through `z.toJSONSchema()`
 * .note = the `pragma` local is annotated with the PUBLISHED `DomainObjectPragmaRef` rather than
 *   inlined into the `.meta()` call. `.meta()` takes zod's `GlobalMeta`, whose `[k: string]: unknown`
 *   index signature accepts any shape at all — so an inline literal is checked against no type, and
 *   a rename of a published pragma field would fail neither `tsc` nor a snapshot, only a downstream
 *   consumer's codegen. the annotation makes the compiler the guard. the twin of
 *   `asDomainObjectPragma` in `getContract.ts`; kept inline here rather than extracted to a named
 *   cast, since both fields arrive as directly-typed parameters — there is no shape assembly to name.
 */
const stampRef = (
  schema: ZodSchema<any>,
  of: string,
  by: DomainObjectRefBy,
): ZodSchema<any> => {
  const pragma: DomainObjectPragmaRef = { of, by };
  return schema.meta({ 'x-domain-object-ref': pragma });
};

/**
 * .what = guards + flat pick of the declared key fields for a grain, each field made REQUIRED
 * .why = the trivial half of a key contract: fail loud on an absent key, then pick the key sub-shape.
 *   isolated from the nested-graph reduction so the simple path stays simple and independently testable.
 * .note = ⭐ the required-ness rides on a per-field `.nonoptional({ error })` rather than the
 *   object-level `.required()`, and the reason is the MESSAGE, not the behavior — the two are
 *   equivalent on parse and on emit. `.required()` takes no error params, so a refusal read
 *   `Invalid input: expected nonoptional, received undefined`: zod's internal vocabulary, with no
 *   name of the dobj, the grain, or the move a caller should make. every other guard on this
 *   surface names the fix (`rule.require.errors-name-the-fix`), and the runtime twin already does
 *   — `refByPrimary` throws *"primary key 'uuid' is undefined; primary keys must have defined
 *   values at reference time"*. an undocumented asymmetry between two surfaces that decide the
 *   same question is the defect class this pr has fixed repeatedly, so the schema now speaks the
 *   same way the ctor does.
 *
 * .note = the required-ness itself is load-critical, not cosmetic. `.pick()` inherits optionality from the
 *   author's schema, and a primary key is commonly declared `z.string().optional()` (it is
 *   db-generated). without this, the primary arm of `.ref()` succeeds VACUOUSLY on a payload that
 *   carries only the unique key — the union never reaches the unique arm, and `.ref()` parses to
 *   `{}`: a reference to nowhere, reported as a success (`rule.forbid.failhide`).
 *
 * .note = ⚠️ it applies to BOTH grains, deliberately — the one gate here serves `primary` and
 *   `unique` alike, because the argument does not turn on which key it is: a reference names a real
 *   value, or it names none. a `unique` key whose value may be absent is a reference to nowhere by
 *   the same argument, so the grains agree rather than diverge.
 *
 *   each grain's three surfaces agree, and all six say the same:
 *     |        | the type (`RefBy*.type.ts`) | the ctor (`refBy*.ts`) | the schema (this pick) |
 *     | primary| `Required<Pick<…>>`         | throws on `undefined`  | `.required()`          |
 *     | unique | `Required<Pick<…>>`         | throws on `undefined`  | `.required()`          |
 *
 *   ⚠️ the `unique` row is NEW. its type was a bare `Pick` and its ctor assigned `undefined`
 *   silently, so this pick alone demanded the key — and a disagreement is how a ref-to-nowhere
 *   passes one surface while another calls it valid. all three were aligned rather than this one
 *   relaxed, because the lenient direction is the failhide. clamped by table F.
 */
const pickDeclaredKeys = (
  dobj: DomainObjectClass,
  by: 'primary' | 'unique',
): ZodObjectLike => {
  const schema = getObjectSchemaOrThrow(dobj);
  const keys = getKeysOrThrow(dobj, by);
  const { shape } = schema;

  // fail loud if any declared key is absent from the schema (never pick a hole)
  assertKeysInSchemaShape({
    dobjName: dobj.name,
    keys,
    shape,
    label: `${dobj.name}.contract().ref('${by}')`,
    declaredIn: `static ${by}`,
  });

  // pick only the declared key fields, each required (see .note — a ref must name a real key)
  const picked = schema.pick(
    Object.fromEntries(keys.map((key): [string, true] => [key, true])),
  );

  // and make each required through `.nonoptional(params)` rather than `.required()`, so the refusal
  // carries OUR message rather than zod's `expected nonoptional, received undefined` — see .note
  return picked.extend(
    Object.fromEntries(
      keys.map((key): [string, ZodSchema<any>] => [
        key,
        picked.shape[key]!.nonoptional({
          error: `${dobj.name}.contract().ref('${by}'): ${by} key '${key}' is undefined; a reference must name a real key value. supply '${key}', or reference by the other grain`,
        }),
      ]),
    ),
  );
};

/**
 * .what = reduces each nested-dobj unique key to its own unique ref, atop the flat `picked` base
 * .why = for `unique`, a key that is itself a nested dobj recurses to that dobj's own unique ref —
 *   to match `refByUnique`'s runtime reduction (vision q2). the genuinely-complex half: graph
 *   recursion, cyclic guard, and the polymorphic-arm fail-fast, isolated from the flat pick.
 * .note = `seen` guards a cyclic unique-key graph (A.unique → B, B.unique → A) — fail loud.
 *   the nested recursion goes through `getContractRefSeen` (not a raw build) so a nested dobj's ref
 *   is memoized too — the same instance a direct `Nested.contract().ref('unique')` returns (idempotency).
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
    // (vision q2). fail loud rather than lie. (a union of each arm's own `.contract().ref('unique')`
    // is the faithful form; deferred as a focused follow-up.) if NO arm declares unique, runtime
    // embeds the whole value for every arm, so the flat pick is faithful — keep it.
    if (Array.isArray(declaration)) {
      const arms: DomainObjectClass[] = declaration;
      const armsWithUnique = arms.filter((Arm) => hasDeclaredUniqueKey(Arm));
      if (armsWithUnique.length)
        throw new ConstraintError(
          `${dobj.name}.contract().ref('unique'): unique key '${key}' is a polymorphic nested dobj (choices: ${arms
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
        `${dobj.name}.contract().ref('unique'): cyclic unique-key graph via '${key}' → ${NestedDobj.name}`,
        { domainObject: dobj.name, by: 'unique', key, nested: NestedDobj.name },
      );
    // memoized recursion: same stamped instance a direct Nested.contract().ref('unique') returns
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
      `${dobj.name}.contract().ref received an unrecognized 'by' value: ${JSON.stringify(
        by,
      )}. expected 'primary' | 'unique' | 'ref'`,
      { domainObject: dobj.name, by },
    );

  // by === 'ref' → union of whichever grains the dobj declares.
  // ⚠️ an EMPTY declaration is not a declared grain: `[]` is truthy, so a bare `if (dobj.unique)`
  // built an arm that picks no key at all, and that vacuous arm then matched EVERY payload — so a
  // union that also declares a real grain would never reach it. one empty declaration silently
  // swallowed the whole union (`rule.forbid.failhide`). same fact as `getKeysOrThrow`'s gate.
  const arms: ZodObjectLike[] = [];
  if (dobj.primary?.length) arms.push(buildKeyContract(dobj, 'primary', seen));
  if (hasDeclaredUniqueKey(dobj))
    arms.push(buildKeyContract(dobj, 'unique', seen));
  if (arms.length === 0)
    throw new ConstraintError(
      `${dobj.name}.contract().ref() requires at least one of \`static primary\` / \`static unique\` on ${dobj.name} to name at least one key field`,
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
 * .what = returns a dobj's `.contract().ref(by)`: a zod schema of only the referenced key fields,
 *   stamped with an `x-domain-object-ref` pragma so a *reference* survives `z.toJSONSchema()`
 * .why =
 *   - `.contract()` embeds the WHOLE dobj (composition); a field that only *names* another dobj by
 *     key needs a smaller, stamped form — this is that form
 *   - lets a cross-service consumer emit a typed `RefBy*<typeof X>` instead of an anonymous shape
 * .note = memoized per class + per `by` (via getContractRefSeen), so repeated access — and any
 *   nested-dobj recursion — returns the same stamped instance
 */
export const getContractRef = (
  dobj: DomainObjectClass,
  by: DomainObjectRefBy,
): ZodSchema<any> => getContractRefSeen(dobj, by, []);
