import { ConstraintError } from 'helpful-errors';
import type { ZodType } from 'zod';

import type { DomainObjectConstructor } from '@src/instantiation/DomainObjectConstructor';
import {
  isZodSchema,
  isZodSchemaWithMeta,
} from '@src/instantiation/validate/validate';
import type { Ref } from '@src/reference/Ref.type';
import type { Refable } from '@src/reference/Refable';
import type { RefByPrimary } from '@src/reference/RefByPrimary.type';
import type { RefByUnique } from '@src/reference/RefByUnique.type';

import { assertKeysInSchemaShape } from './assertKeysInSchemaShape';
import type { DomainObjectClass } from './DomainObjectClass';
import type {
  DomainObjectPragma,
  DomainObjectRefBy,
} from './DomainObjectPragma';
import { getContractRef } from './getContractRef';
import { getKind } from './getKind';
import type { ConstructorOf } from './HasReadonly.type';
import type { WithImmute } from './immute/withImmute';

/**
 * .what = `Ref<TClass>` when the class is referenceable; a loose type when it declares no keys
 * .why = `Refable` demands both `primary` and `unique`, which a keyless `DomainLiteral` declares
 *   neither of. a hard constraint would make `.contract()` itself uncallable on such a class, so
 *   the degrade lands on the ref-shaped members only — where a key type genuinely cannot be derived.
 * .note = ⚠️ the repeated `TClass extends Refable<…> ? … : any` reads like a rule-of-three case, and
 *   the obvious extraction —`Gate<TClass, TRef> = TClass extends Refable<…> ? TRef : any` — does not
 *   compile. measured: `TS2344 ×3`, because the true branch is exactly what NARROWS `TClass` to
 *   `Refable`, and a hoisted `TRef` argument is resolved at the call site, where it is still
 *   unnarrowed. the only shape that survives dispatches on a tag INSIDE the conditional — a type
 *   parameter with a switch, which `rule.prefer.wet-over-dry` names as the premature-abstraction
 *   signal. so the repeat is deliberate: three plain lines beat a nested tag dispatch, and the
 *   compiler refuses the middle option outright.
 */
type RefOf<TClass> = TClass extends Refable<any, any, any> ? Ref<TClass> : any;
type RefByPrimaryOf<TClass> =
  TClass extends Refable<any, any, any> ? RefByPrimary<TClass> : any;
type RefByUniqueOf<TClass> =
  TClass extends Refable<any, any, any> ? RefByUnique<TClass> : any;

/**
 * .what = the boundary schema a dobj's `.contract()` call returns: a zod schema that PARSES plain
 *   wire props INTO a live dobj instance, plus a typed `.ref(by)` for a key-only reference to it
 * .why =
 *   - a dobj has exactly two contractual concerns, and one declaration serves both:
 *     instantiation (`X.contract().parse(wire)` → an instance) and introspection
 *     (`z.toJSONSchema(X.contract(), { io: 'input' })` → the wire shape + the `x-domain-object` pragma)
 *   - the two faces are the two sides of the same schema; the caller picks which by the call it makes
 * .note = the `.ref` method is a function property on the schema; it does not appear in
 *   `z.toJSONSchema()` output (which walks zod's internal `_zod.def`, not own-enumerable keys)
 * .note = call `.ref(by)` on the RAW contract, before any other zod chain op. zod ops like
 *   `.optional()` / `.nullable()` / `.describe()` return a fresh schema WITHOUT `.ref`, so
 *   `X.contract().optional().ref('primary')` fails (a `TypeError` in js, a compile error in ts).
 *   embed the ref first, then chain: `z.object({ x: X.contract().ref('primary') }).optional()`.
 */
export interface ContractOf<TClass extends ConstructorOf<any>>
  extends ZodType<WithImmute<InstanceType<TClass>>, InstanceType<TClass>> {
  /**
   * the union of whichever key refs this dobj declares (primary and/or unique)
   */
  ref(): ZodType<RefOf<TClass>>;
  /**
   * a reference by the dobj's declared `static primary` key(s)
   */
  ref(by: 'primary'): ZodType<RefByPrimaryOf<TClass>>;
  /**
   * a reference by the dobj's declared `static unique` key(s)
   */
  ref(by: 'unique'): ZodType<RefByUniqueOf<TClass>>;
}

/**
 * .what = the type of a domain object's `.contract`: a plain function whose CALL yields the
 *   boundary schema, typed as the subclass it was called on
 * .why = typescript carries a subclass's identity through a CALL, never through a property access —
 *   a static member is typed once, on the base, where no member can mention the subclass. the `this`
 *   parameter is the only channel through which `X.contract()` can return a schema that names `X`.
 * .note = invoke ON THE CLASS. a detached receiver (`const c = X.contract; c()`) is a compile error,
 *   since `this` then has no receiver to read — by design, so the type can never silently widen.
 */
export type DomainObjectContract = <TClass extends ConstructorOf<any>>(
  this: TClass,
) => ContractOf<TClass>;

/**
 * .what = reads the author's schema shape; fails fast unless it is a zod *object* schema
 * .why =
 *   - ⚠️ a contract COERCES. its decode ends in `X.build(props)` → `Object.assign(this, props)`, and
 *     a domain object is a record of named props by construction (`DomainObjectShape =
 *     Record<string, any>`). a scalar schema has no named props to assign, so — measured — a
 *     `z.string()` dobj given `'thruster'` parsed to `{"0":"t","1":"h","2":"r",…}`: an object with
 *     `instanceof X === true` whose every field is a character index.
 *   - and that corruption is INVISIBLE to the guard built to catch exactly this. the ctor does not
 *     throw, so `coerceIntoInstance`'s catch never engages, no zod issue is raised, and
 *     `if (!result.success)` reads clean. a nonsense instance crosses a public boundary and is
 *     reported as a successful parse (`rule.forbid.failhide` — the failure travels no channel at all).
 * .note = ⚠️ this was `.contract()`'s THIRD instance of one asymmetry: `.ref` demanded an object
 *   schema, `.nested` did not (fixed one round earlier), and the coerce path itself did not either —
 *   though it is the one position that actually CONSTRUCTS from the shape, and so the one with the
 *   most to lose. the pattern worth carried forward: when a sibling surface guards something and
 *   this one does not, the asymmetry is the defect, not the guard.
 * .note = it breaks no form that ever worked. `.contract()` always coerces (f2) and the bare
 *   `.contract` property was removed as a schema (f10), so there is no reachable form in which a
 *   scalar-schema dobj produced a usable value. the throw replaces silent corruption, not a feature.
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): zod's `ZodType` does not surface
 *   `.shape` to a type-only consumer, so the `typeof` probe IS the type guard that makes the read
 *   sound — the same device `getContractRef.getObjectSchemaOrThrow` uses, for the same reason.
 *   removal path: when this lib accepts a typed `z.ZodObject` rather than `SchemaOptions`.
 * .note = ⚠️ this probes `.shape` ONLY, while `getContractRef.getObjectSchemaOrThrow` probes
 *   `.shape` AND `.pick`. that difference is deliberate, and it is not the asymmetry-is-the-defect
 *   pattern the note above warns about — it is its opposite. each guard probes exactly the members
 *   its own caller goes on to USE: this one reads `shape`; the ref path additionally calls `.pick()`.
 *   a probe that demanded more than its caller needs would refuse a schema that would have worked,
 *   and a probe that demanded less would leave its own cast unsound. the pattern the other note
 *   names is *one surface guards, the sibling does not*; here both guard, each at its own precondition.
 *   a schema with `.shape` but no `.pick` therefore passes here and fails at `.ref` — correctly, with
 *   a message that names `.ref` as the surface reached (`rule.require.errors-name-the-fix`), the same
 *   argument that keeps the no-schema / non-zod / pre-v4 trio duplicated rather than shared.
 *   collapse the two into one `getZodObjectShapeOrThrow` at the THIRD caller, per
 *   `rule.prefer.wet-over-dry` — and only if a third caller's needs actually match one of these two.
 */
const getObjectShapeOrThrow = (
  dobj: DomainObjectClass,
  schema: ZodType<any, any>,
): Record<string, unknown> => {
  const { shape } = schema as unknown as { shape?: Record<string, unknown> };
  if (typeof shape !== 'object' || shape === null)
    throw new ConstraintError(
      `${dobj.name}.contract() requires an object schema (z.object); a contract coerces the wire payload into a ${dobj.name} instance, and a domain object is a record of named props — a scalar or array schema carries none, so the construct would yield an instance of indexed characters rather than fail. declare ${dobj.name}'s schema as a z.object (wrap a scalar as z.object({ value: … }) if ${dobj.name} genuinely models one)`,
      { domainObject: dobj.name },
    );
  return shape;
};

/**
 * .what = a `.nested` value: a single dobj constructor, or an array of constructor choices (polymorphic nested)
 * .why = mirrors `hydrateNestedDomainObjects`, which supports both forms; getContract must handle both to stay consistent
 */
type NestedDeclaration = DomainObjectConstructor | DomainObjectConstructor[];

/**
 * .what = maps a `.nested` declaration to nested dobj names only (string, or string[] for polymorphic
 *   choices) — after it fails fast unless every nested key names a real field on the author's schema
 * .why = the contract carries nested identity by name, never the constructor objects (name-only per vision)
 * .note = handles both the single-constructor and array-of-constructors forms, like `hydrateNestedDomainObjects`
 * .note = ⚠️ the guard is the point of this signature. an unguarded map published
 *   `x-domain-object: { nested: { board: 'Surfboard' } }` against a json-schema whose `properties`
 *   carry no `board` — and `hydrateNestedDomainObjects` no-ops on an absent key, so `.parse()` still
 *   succeeded and every in-repo assertion stayed green. the lie reached only a downstream consumer's
 *   codegen: the exact audience this pragma exists to serve, and the wrong channel for a failure
 *   (`rule.forbid.failhide`). `.ref` already held this gate (*"never pick a hole"*); the asymmetry
 *   between the two surfaces WAS the defect, so both now share one primitive.
 * .note = `shape` arrives already read + guarded by `getObjectShapeOrThrow`, which every contract
 *   passes through. an earlier draft probed the shape HERE and narrowed the object demand to the
 *   `.nested` branch alone, on the belief that a `z.string()` dobj was legal. measured, it is not:
 *   the coerce silently produced an instance of indexed characters. so the demand belongs one level
 *   up, on the coerce path itself, and this function reads a shape it can trust.
 */
const toNestedNames = (
  dobj: DomainObjectClass,
  nested: Record<string, NestedDeclaration>,
  shape: Record<string, unknown>,
): Record<string, string | string[]> => {
  // fail loud if any nested key is absent from the schema (never advertise a field that is not there)
  assertKeysInSchemaShape({
    dobjName: dobj.name,
    keys: Object.keys(nested),
    shape,
    label: `${dobj.name}.contract()`,
    declaredIn: 'static nested',
  });

  const entries = Object.entries(nested).map(([key, declaration]) => [
    key,
    Array.isArray(declaration)
      ? declaration.map((NestedClass) => NestedClass.name)
      : declaration.name,
  ]);
  return Object.fromEntries(entries);
};

/**
 * .what = per-class memo of the contract function, keyed by the dobj class constructor
 * .why = `.contract` is a getter, so it re-runs on every access; cache per-class so `X.contract`
 *   and `X.contract()` are both referentially stable (the vision's pit-of-success idempotency)
 */
const contractByClass = new WeakMap<DomainObjectClass, DomainObjectContract>();

/**
 * .what = true when an error signals a CODE fault (a bug) rather than a payload fault
 * .why =
 *   - the coerce guard must contain a *payload* failure as a zod issue, but a bug in code is not a
 *     payload failure: to bury a `TypeError` in a zod issue that reads *"align your static schema"*
 *     sends a debugger down the wrong path, and buries the stack that names the real line
 *     (`rule.forbid.failhide` — a catch must allowlist, and rethrow the rest).
 *   - the split is by FAULT rather than by error class, deliberately. an allowlist of this lib's own
 *     error types would silently break the guard for a consumer whose constructor throws its own
 *     domain error — and that containment is the guard's whole purpose (the vision's g4/g5). the
 *     js-native fault types are the narrow, complete set that no domain error belongs to.
 * .note = these six are every ecmascript `Error` subclass a RUNTIME raises on its own, in
 *   alphabetical order so an absence is visible at a glance. a partial set is worse than none: it
 *   fixes the defect for the types it names and leaves the identical misdirection for the rest,
 *   which reads as handled. `getContract.coerce.test.ts` enumerates all six as a caselist, so the
 *   "which types rethrow" contract is proven rather than assumed.
 * .note = ⚠️ `AggregateError` is deliberately ABSENT, though it is the seventh native subclass. it
 *   is the only one no runtime can raise into a constructor: a constructor cannot `await`, so it
 *   cannot inherit one from a rejected `Promise.any`. the sole way a ctor yields one is a DELIBERATE
 *   `throw new AggregateError([...errors])` — which is the shape a validator uses to report several
 *   domain failures at once. that is a payload fault, so it must stay CONTAINED; to rethrow it would
 *   reopen the same failhide from the other direction — a real validation failure that escapes
 *   `safeParse` as a raw crash. recorded as a note rather than dropped silently, so the next reader
 *   sees the case was weighed. clamped in `getContract.coerce.test.ts`.
 * .note = `HelpfulSchemaValidationError` and `NestedDomainObjectHydrationError` extend `Error`, not
 *   any of these, so the reachable ctor failures stay contained.
 */
const isCodeFault = (error: unknown): boolean =>
  error instanceof EvalError ||
  error instanceof RangeError ||
  error instanceof ReferenceError ||
  error instanceof SyntaxError ||
  error instanceof TypeError ||
  error instanceof URIError;

/**
 * .what = the coerce step: constructs the dobj from the parsed props, and contains a ctor throw
 *   as a zod issue rather than let it escape the parse — while a code fault still escapes
 * .why =
 *   - a caller at a boundary asked zod to validate a payload; a throw from the middle of that parse
 *     is a second, un-catchable failure channel. one channel — the ZodError — is the contract.
 *   - the schema and the constructor can genuinely disagree (nested hydration, a stricter ctor), so
 *     the throw is reachable in practice; the issue message names the fix rather than the symptom.
 * .note = `build` (not `new`) so the root instance carries `.clone`, as every other instantiation
 *   path in the lib does. this mirrors `deserialize`'s `toHydratedObject`, which rebuilds a dobj
 *   from plain props the same way — `.build(props, { skip })`, and leans on the same two effects
 *   (`withImmute` at the root, `hydrateNestedDomainObjects` below it).
 * .note = `{ skip: { schema: true } }` because zod validated these exact props one step earlier;
 *   a second full validation is pure cost on the hot path of every request.
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): `DomainObjectClass` is the static
 *   METADATA view (name/schema/keys/nested) and omits `build`, so the two readers of that view
 *   cannot drift. the cast reaches the one instantiation member this file needs — and it names the
 *   extant `DomainObjectConstructor` rather than a fresh inline shape, so a later change to
 *   `build`'s signature reaches this reader rather than slips past it. removal path: when the class
 *   view and the constructor view are unified into one type.
 */
const coerceIntoInstance = (
  dobj: DomainObjectClass,
  props: any,
  ctx: { addIssue: (issue: any) => void },
): any => {
  const builder = dobj as unknown as DomainObjectConstructor;
  try {
    return builder.build(props, { skip: { schema: true } });
  } catch (error) {
    // a code fault is NOT a payload failure — rethrow it so it fails fast, with its own stack
    // intact, rather than surface as a zod issue whose suggested fix points at the wrong thing
    if (isCodeFault(error)) throw error;

    const detail = error instanceof Error ? error.message : String(error);
    ctx.addIssue(
      `${dobj.name}.contract(): the props satisfied the schema, but \`${dobj.name}.build(props)\` threw — ${detail}. fix: align \`static schema\` with what the constructor demands (e.g. its \`static nested\` hydration), so any payload the schema accepts can also construct`,
    );
    // zod discards the return value once an issue is added; the parse resolves to a ZodError
    return undefined as never;
  }
};

/**
 * .what = casts a dobj class's static declarations into its `x-domain-object` pragma — the wire
 *   document a cross-service consumer reads to rebuild the class
 * .why =
 *   - the return annotation is the point: `schema.meta()` takes zod's `GlobalMeta`, which carries a
 *     `[k: string]: unknown` index signature, so it accepts ANY shape. an inline literal therefore
 *     type-checks no matter what it holds, and `DomainObjectPragma` — the type this lib **publishes**
 *     for consumers to read — was never checked against the object actually stamped. a rename or a
 *     drop of a pragma field would fail neither `tsc` (the literal is inferred, never compared) nor
 *     any snapshot (a type-only edit changes no runtime output), and would surface first in a
 *     downstream consumer's codegen. one named cast makes the compiler the guard.
 *   - it is the writer-side twin of the hazard `DomainObjectClass` records for the reader side: one
 *     shared shape, so the runtime stamp and the published type cannot silently drift.
 * .note = ⚠️ MEASURED LIMIT — this annotation covers the two direct fields fully and the four
 *   conditional-spread fields only partially, because typescript does not apply its EXCESS-PROPERTY
 *   check through a spread. so, measured by a rename of `primary` on the published type:
 *     - a rename/drop of `name` or `kind` → caught HERE, at the source
 *     - a TYPE mismatch on a spread field whose name still matches → caught HERE (this is what
 *       surfaced the `readonly string[]` vs `string[]` divergence the untyped literal had hidden)
 *     - a rename/drop of `primary`/`unique`/`alias`/`nested` → NOT caught here; the stale key rides
 *       through the spread as an unchecked excess property
 *   the last row is closed one layer out, by `getContract.test.ts`'s *"the stamped pragma conforms
 *   to the published DomainObjectPragma type"* clamp, which builds its expectation AS a
 *   `DomainObjectPragma` — measured, that rename fails `tsc` there with `TS2353` + `TS2339`. `tsc`
 *   runs over tests too, so the gate outcome is the same; the split is recorded rather than papered
 *   over, so nobody reads this annotation as a stronger guard than it is.
 *   ⛔ four `satisfies Pick<DomainObjectPragma, …>` clauses would move that last row here, and were
 *   rejected: identical gate coverage for four lines of noise on the hot path.
 * .note = `primary`/`unique` are COPIED, never assigned. two reasons, and the first is structural:
 *   `DomainObjectClass` declares them `readonly string[]` (dobjs declare them `as const`) while the
 *   pragma declares them `string[]`, so a bare assignment is a `TS2322` — measured, and the untyped
 *   literal is exactly what hid that divergence. the copy resolves it without a widen of the
 *   published type, and a widen would be the wrong fix: a pragma describes a WIRE document, and a
 *   consumer who `JSON.parse`s one genuinely holds a mutable array.
 *   ⚠️ the second reason is a latent hazard rather than a live one: a bare assignment would put the
 *   class's own static array into the pragma, so a mutation of `pragma.primary` would reach
 *   `Klass.primary` and every other reader of it. measured, that is NOT reachable today — the only
 *   public path to the pragma is `z.toJSONSchema`, which already emits a fresh array, and `.meta()`
 *   reads `undefined` on the coerced schema. so the copy makes that safety OUR guarantee rather than
 *   a dependency's. clamped in `getContract.test.ts`.
 */
const asDomainObjectPragma = (
  dobj: DomainObjectClass,
  shape: Record<string, unknown>,
): DomainObjectPragma => ({
  name: dobj.name,
  kind: getKind(dobj), // the true subclass (entity/literal/event/object), from the class marker
  ...(dobj.primary ? { primary: [...dobj.primary] } : {}),
  ...(dobj.unique ? { unique: [...dobj.unique] } : {}),
  ...(dobj.alias ? { alias: dobj.alias } : {}),
  ...(dobj.nested ? { nested: toNestedNames(dobj, dobj.nested, shape) } : {}),
});

/**
 * .what = builds the boundary schema for one dobj class: the author's schema, stamped with the
 *   `x-domain-object` pragma, then coerced into a live instance, then augmented with `.ref`
 * .why = one declaration, read two ways — `.parse(wire)` crosses the boundary, `z.toJSONSchema(…,
 *   { io: 'input' })` describes it. the pragma sits on the IN side, which is the only face that
 *   emits at all AND the only one that carries the identity a downstream codegen reads.
 * .note = `.ref` is hung as a NON-enumerable, non-writable, non-configurable own property, the way
 *   withImmute attaches `.clone` (withImmute.ts). non-enumerable so `Object.keys(contract)` /
 *   `{ ...contract }` / a log never leak the fn where a pure zod schema is expected — the schema
 *   stays indistinguishable from an un-augmented one to every enumerable-key consumer.
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): `.transform()` is typed to return a
 *   zod schema, which cannot express "this schema now also carries our `.ref` method". the cast
 *   asserts the shape defineProperty just produced. removal path: when zod exposes a typed
 *   schema-augmentation api, or the lib returns a wrapper instead of the schema itself.
 */
const buildContract = (
  dobj: DomainObjectClass,
  schema: ZodType<any, any>,
): ZodType<any, any> => {
  // read the object shape; a coerce constructs from named props, so a scalar schema cannot serve
  const shape = getObjectShapeOrThrow(dobj, schema);

  // assemble the x-domain-object pragma from the declared statics (omit absent fields)
  const pragma = asDomainObjectPragma(dobj, shape);

  // stamp the pragma via zod's `.meta()` registry (returns a fresh schema, the author's untouched),
  // then coerce the parsed props into a live dobj instance
  const stamped = schema.meta({ 'x-domain-object': pragma });
  const coerced = stamped.transform((props: any, ctx: any) =>
    coerceIntoInstance(dobj, props, ctx),
  );

  // hang the typed `.ref(by)` accessor onto the boundary (see .note)
  return Object.defineProperty(coerced, 'ref', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (by?: DomainObjectRefBy) => {
      // ⛔ `'ref'` is not a caller-supplied grain — the no-argument call IS the union (f11). the
      // typescript surface already refuses the argument; this makes the runtime agree, so a js
      // caller meets a named error rather than a silent success on a form ts forbids
      // (`rule.require.errors-name-the-fix`; and the vision's own *prefer a loud refusal over a
      // silent success*, the same rule that removed the bare `.contract` property at f10).
      // ⚠️ `'ref'` REMAINS the internal normalized value and the wire pragma value
      // (`x-domain-object-ref: { by: 'ref' }`) — what is refused is a caller who supplies it.
      if (by === 'ref')
        throw new ConstraintError(
          `${dobj.name}.contract().ref('ref') is not a grain — call \`.ref()\` with no argument for the union of the declared grains. expected 'primary' | 'unique' | no argument`,
          { domainObject: dobj.name, by },
        );
      return getContractRef(dobj, by ?? 'ref');
    },
  }) as ZodType<any, any>;
};

/**
 * .what = returns a domain object's `.contract`: a function whose call yields the boundary schema —
 *   the author's `schema`, stamped with identity + key metadata, that parses wire props into a
 *   live instance of the dobj
 * .why =
 *   - lets a domain object's identity survive `z.toJSONSchema()` as an `x-domain-object` pragma,
 *     so a cross-service consumer can name, de-dupe, and reconstruct the dobj from the wire
 *   - lets a boundary hand back a real dobj instance from `.parse(wire)`, rather than a bare bag
 *     of props the caller must remember to instantiate
 * .note = `schema` validates; `contract()` identifies AND instantiates. the contract is the schema
 *   that knows its own name + keys, and that hands you the dobj rather than its props.
 * .note = the guards run on ACCESS (`X.contract`), not on call, so a misdeclared dobj fails loud at
 *   the first touch rather than at the first parse.
 * .note = memoized per class, so `X.contract`, `X.contract()`, and `X.contract().ref(by)` each
 *   return the same instance on every access (idempotent).
 * .note = ⚠️ the no-schema guard names TWO fixes, and the second is the one a reader would never
 *   guess. a TREE-SHAPED dobj (`Comment` with `replies: Comment[]`) reaches for the obvious form:
 *
 *     static schema = z.object({ replies: z.array(Comment.contract()) });   // ⛔ throws
 *
 *   per js class-field evaluation order, a static field's initializer runs BEFORE that field is
 *   assigned onto the constructor — so `Comment.schema` is still `undefined` while its own
 *   initializer runs, and this guard fires. measured: it does, with `ConstraintError`.
 *   the state is genuinely AMBIGUOUS at this point: an absent `static schema` and a mid-initializer
 *   self-reference are the same observation, so no probe can tell them apart. rather than guess a
 *   cause and name one fix (which would be actively wrong half the time — the tree author DID
 *   declare a schema), the message names both, each with its own condition
 *   (`rule.require.errors-name-the-fix`: name the fix, and when there are two, name two).
 *   ⭐ `z.lazy(() => Comment.contract())` is the escape: the callback defers to first parse/emit, by
 *   which point the class has finished its initialization. measured to hydrate recursively AND to
 *   emit — zod represents the recursion as `{ "$ref": "#" }`, pragma intact. clamped in
 *   `getContract.coerce.test.ts` and snapshotted at acceptance grain.
 *   ⚠️ this hazard is NEW with this feature, not extant before it: `static nested = { replies:
 *   Comment }` is a bare identifier reference and was always fine. `.contract()` is the first
 *   surface that asks a dobj to CALL a method on itself from inside its own static initializer.
 * .note = as-cast boundary (`rule.forbid.as-cast` exception): the returned function ignores `this`
 *   at runtime (it closes over `dobj`, so a detached call is still CORRECT, merely un-typed); the
 *   `this` parameter exists purely to carry the subclass's identity into the return type, which no
 *   static member can do on its own. the cast bridges that type-only device. removal path: when
 *   typescript allows a static member to reference its own class type parameter.
 */
export const getContract = (dobj: DomainObjectClass): DomainObjectContract => {
  // return the memoized contract if this class was already built (idempotent per-class)
  const contractMemoized = contractByClass.get(dobj);
  if (contractMemoized) return contractMemoized;

  // fail fast if no schema is declared; a contract has no shape to identify without one.
  // ⚠️ the message names TWO fixes because the state has two causes and they are indistinguishable
  // here — see the .note on `getContract`
  const { schema } = dobj;
  if (!schema)
    throw new ConstraintError(
      `${dobj.name}.contract() requires a static schema. either declare \`static schema\` (zod) on ${dobj.name} to use .contract() — or, if this call is a SELF-REFERENCE from inside ${dobj.name}'s own \`static schema\` initializer (a tree-shaped dobj), the field is not assigned yet at that moment: defer it with \`z.lazy(() => ${dobj.name}.contract())\``,
      { domainObject: dobj.name },
    );

  // fail fast if the schema is not zod; only zod can carry the json-schema identity pragma
  if (!isZodSchema(schema))
    throw new ConstraintError(
      `${dobj.name}.contract() requires a zod schema; joi/yup cannot carry json-schema identity. keep .schema for validation, but .contract() needs zod`,
      { domainObject: dobj.name },
    );

  // fail fast if the zod schema predates v4. `isZodSchema` duck-types on `.safeParse`, which zod v3
  // exposes too — so without this a v3 schema passes that guard and then meets a raw
  // `TypeError: schema.meta is not a function` from inside the pragma stamp. one voice, one message
  // family: every other structural mismatch on this surface is a named ConstraintError
  if (!isZodSchemaWithMeta(schema))
    throw new ConstraintError(
      `${dobj.name}.contract() requires zod v4+; the declared schema has no \`.meta()\`, which the x-domain-object pragma is stamped through. upgrade zod to v4 on ${dobj.name}'s schema`,
      { domainObject: dobj.name },
    );

  // build the boundary once, then hand back a function that always yields that same instance
  const boundary = buildContract(dobj, schema);
  const contract = (() => boundary) as unknown as DomainObjectContract;

  // memoize per-class so the next access returns this same fn (idempotent, vision pit-of-success)
  contractByClass.set(dobj, contract);
  return contract;
};
