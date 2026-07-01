import { ConstraintError } from 'helpful-errors';
import type { ZodSchema } from 'zod';

import type { DomainObjectConstructor } from '@src/instantiation/DomainObjectConstructor';
import type { SchemaOptions } from '@src/instantiation/validate/validate';
import { isZodSchema } from '@src/instantiation/validate/validate';

/**
 * .what = a `.nested` value: a single dobj constructor, or an array of constructor choices (polymorphic nested)
 * .why = mirrors `hydrateNestedDomainObjects`, which supports both forms; getContract must handle both to stay consistent
 */
type NestedDeclaration = DomainObjectConstructor | DomainObjectConstructor[];

/**
 * .what = the static-metadata view of a domain object class, by the statics getContract reads
 * .why =
 *   - typed structurally (not as `typeof DomainObject`) so concrete dobj subclass constructors are assignable;
 *     `typeof DomainObject` has a generic `<T>` construct signature that subclass constructors do not satisfy
 *   - `primary`/`unique` live on DomainEntity/DomainLiteral, `alias`/`nested` on DomainObject; all optional here
 * .note = broader than the canonical `DomainObjectConstructor` (which omits these key statics); getContract reads
 *   statics only and never instantiates, so it does not require the `new()`/`build` members of that type
 */
type DomainObjectClass = {
  name: string;
  schema?: SchemaOptions<any>;
  primary?: readonly string[];
  unique?: readonly string[];
  alias?: string | { plural?: string; singular?: string };
  nested?: Record<string, any>; // values are NestedDeclaration; matches DomainObject.nested's own imprecise type
};

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
const contractByClass = new WeakMap<DomainObjectClass, ZodSchema<any>>();

/**
 * .what = returns a domain object's `.contract`: its zod `schema` stamped with identity + key metadata
 * .why =
 *   - lets a domain object's identity survive `z.toJSONSchema()` as an `x-domain-object` pragma
 *   - so a cross-service consumer can name, de-dupe, and reconstruct the dobj from the wire
 *   - mirrors how `serialize` stamps `_dobj` onto its string output
 * .note = `schema` validates; `contract` identifies. the contract is the schema that knows its own name + keys.
 *   the result is memoized per-class, so repeated access returns the same stamped instance (idempotent).
 */
export const getContract = (dobj: DomainObjectClass): ZodSchema<any> => {
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
    ...(dobj.primary ? { primary: dobj.primary } : {}),
    ...(dobj.unique ? { unique: dobj.unique } : {}),
    ...(dobj.alias ? { alias: dobj.alias } : {}),
    ...(dobj.nested ? { nested: toNestedNames(dobj.nested) } : {}),
  };

  // stamp the pragma via zod's `.meta()` registry; returns a fresh schema, the author's schema is untouched
  const contract = schema.meta({ 'x-domain-object': pragma });

  // memoize per-class so the next access returns this same instance (idempotent, vision pit-of-success)
  contractByClass.set(dobj, contract);
  return contract;
};
