import { ConstraintError } from 'helpful-errors';
import type { ZodSchema } from 'zod';

import type { DomainObjectConstructor } from '@src/instantiation/DomainObjectConstructor';
import { isZodSchema } from '@src/instantiation/validate/validate';

import type { DomainObjectClass } from './DomainObjectClass';
import type { DomainObjectRefBy } from './DomainObjectPragma';
import { getContractRef } from './getContractRef';
import { getKind } from './getKind';

/**
 * .what = the type of a domain object's `.contract`: its stamped zod schema, plus a `.ref(by)`
 *   method that returns the schema-level reference to this dobj by key
 * .why =
 *   - `.contract` embeds the WHOLE dobj (`x-domain-object`); `.contract.ref(by)` returns a key-only
 *     reference (`x-domain-object-ref`) — the two live together because a ref *is* a smaller contract
 *   - the `.ref` method is a function property on the schema; it does not appear in `z.toJSONSchema()`
 *     output (proven), so an embedded `X.contract` still round-trips unchanged
 * .note = call `.ref(by)` on the RAW `.contract`, before any other zod chain op. zod ops like
 *   `.optional()` / `.nullable()` / `.describe()` return a fresh schema WITHOUT `.ref`, so
 *   `X.contract.optional().ref('primary')` fails (a `TypeError` in js, a compile error in ts).
 *   embed the ref first, then chain: `z.object({ x: X.contract.ref('primary') }).optional()`.
 */
export type DomainObjectContract = ZodSchema<any> & {
  ref: (by: DomainObjectRefBy) => ZodSchema<any>;
};

/**
 * .what = a `.nested` value: a single dobj constructor, or an array of constructor choices (polymorphic nested)
 * .why = mirrors `hydrateNestedDomainObjects`, which supports both forms; getContract must handle both to stay consistent
 */
type NestedDeclaration = DomainObjectConstructor | DomainObjectConstructor[];

/**
 * .what = maps a `.nested` declaration to nested dobj names only (string, or string[] for polymorphic choices)
 * .why = the contract carries nested identity by name, never the constructor objects (name-only per vision)
 * .note = handles both the single-constructor and array-of-constructors forms, like `hydrateNestedDomainObjects`
 */
const toNestedNames = (
  nested: Record<string, NestedDeclaration>,
): Record<string, string | string[]> => {
  const entries = Object.entries(nested).map(([key, declaration]) => [
    key,
    Array.isArray(declaration)
      ? declaration.map((NestedClass) => NestedClass.name)
      : declaration.name,
  ]);
  return Object.fromEntries(entries);
};

/**
 * .what = per-class memo of the stamped contract, keyed by the dobj class constructor
 * .why = `.meta()` returns a fresh schema on each call; cache per-class so repeated `.contract`
 *   access is idempotent (same instance back), per the vision's pit-of-success contract
 */
const contractByClass = new WeakMap<DomainObjectClass, DomainObjectContract>();

/**
 * .what = returns a domain object's `.contract`: its zod `schema` stamped with identity + key metadata
 * .why =
 *   - lets a domain object's identity survive `z.toJSONSchema()` as an `x-domain-object` pragma
 *   - so a cross-service consumer can name, de-dupe, and reconstruct the dobj from the wire
 *   - mirrors how `serialize` stamps `_dobj` onto its string output
 * .note = `schema` validates; `contract` identifies. the contract is the schema that knows its own name + keys.
 *   the result is memoized per-class, so repeated access returns the same stamped instance (idempotent).
 * .note = the returned contract also carries a `.ref(by)` method — `.contract.ref('primary')` returns
 *   the schema-level *reference* to this dobj by key (an `x-domain-object-ref` pragma; see getContractRef).
 */
export const getContract = (dobj: DomainObjectClass): DomainObjectContract => {
  // return the memoized contract if this class was already stamped (idempotent per-class)
  const contractMemoized = contractByClass.get(dobj);
  if (contractMemoized) return contractMemoized;

  // fail fast if no schema is declared; a contract has no shape to identify without one
  const { schema } = dobj;
  if (!schema)
    throw new ConstraintError(
      `${dobj.name}.contract requires a static schema. declare \`static schema\` (zod) on ${dobj.name} to use .contract`,
      { domainObject: dobj.name },
    );

  // fail fast if the schema is not zod; only zod can carry the json-schema identity pragma
  if (!isZodSchema(schema))
    throw new ConstraintError(
      `${dobj.name}.contract requires a zod schema; joi/yup cannot carry json-schema identity. keep .schema for validation, but .contract needs zod`,
      { domainObject: dobj.name },
    );

  // assemble the x-domain-object pragma from the declared statics (omit absent fields)
  const pragma = {
    name: dobj.name,
    kind: getKind(dobj), // the true subclass (entity/literal/event/object), from the class marker
    ...(dobj.primary ? { primary: dobj.primary } : {}),
    ...(dobj.unique ? { unique: dobj.unique } : {}),
    ...(dobj.alias ? { alias: dobj.alias } : {}),
    ...(dobj.nested ? { nested: toNestedNames(dobj.nested) } : {}),
  };

  // stamp the pragma via zod's `.meta()` registry (returns a fresh schema, the author's is
  // untouched), then augment it with the `.ref(by)` accessor — a function property, absent from
  // z.toJSONSchema() output (which walks zod's internal `_zod.def`, not own-enumerable keys).
  //
  // `.ref` is hung as a NON-enumerable, non-writable, non-configurable own property, the way
  // withImmute attaches `.clone` (withImmute.ts). non-enumerable so `Object.keys(X.contract)` /
  // `{ ...X.contract }` / a log never leak the fn where a pure zod schema is expected — the raw
  // schema stays indistinguishable from an un-augmented one to every enumerable-key consumer.
  //
  // as-cast boundary (`rule.forbid.as-cast` exception): `.meta()` is typed to return a zod schema,
  // which cannot express "this schema now also carries our `.ref` method". the cast asserts the
  // shape defineProperty just produced (a zod schema + `.ref`). removal path: when zod exposes a
  // typed schema-augmentation api, or the lib returns a wrapper instead of the schema itself.
  const stamped = schema.meta({ 'x-domain-object': pragma });
  const contract = Object.defineProperty(stamped, 'ref', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (by: DomainObjectRefBy) => getContractRef(dobj, by),
  }) as DomainObjectContract;

  // memoize per-class so the next access returns this same instance (idempotent, vision pit-of-success)
  contractByClass.set(dobj, contract);
  return contract;
};
