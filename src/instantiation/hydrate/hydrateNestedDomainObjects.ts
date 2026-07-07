import { ConstraintError } from 'helpful-errors';
import { omit } from 'type-fns';

import type { DomainObjectConstructor } from '@src/instantiation/DomainObjectConstructor';
import { isOfDomainObject } from '@src/instantiation/inherit/isOfDomainObject';
import { getSchemaFit } from '@src/instantiation/validate/getSchemaFit';

const isArray = <T>(val: T | Array<T>): val is Array<T> => Array.isArray(val);

/**
 * .what = the serialization discriminator key on a nested value (names its DomainObject class)
 * .why = one named constant keeps the four strip/read sites in sync; if the key ever migrates
 *   (e.g. to `__type`), every site updates together with compiler help instead of silent drift
 */
const NESTED_DOBJ_CLASS_KEY = '_dobj';

/**
 * .what = error thrown when a nested domain object prop cannot be hydrated into a declared option
 * .why = every case here is a caller-fixable input problem (bad shape, ambiguity, or non-strict
 *   schema), so we extend ConstraintError — exit code 2, http 400, and helpful metadata format
 */
export class NestedDomainObjectHydrationError extends ConstraintError {}

/**
 * .what = analyzes whether a nested option fits a plain prop, and whether its schema is strict
 * .why = structural disambiguation picks the option whose schema accepts the prop; the strict
 *   check guards against a non-strict schema that would falsely accept a superset object
 * .note = the schema-library details (accept + strict probe) live behind `getSchemaFit`; here we
 *   only add the domain-object rule that an option with no schema "fits" every object but can never
 *   be trusted as strict, so it forces the strict failfast on the try-each path
 */
const analyzeNestedOptionFit = ({
  ClassOption,
  prop,
}: {
  ClassOption: DomainObjectConstructor;
  prop: any;
}): { fits: boolean; strict: boolean } => {
  // no schema → accepts any object (fits), but cannot be trusted as strict
  const { schema } = ClassOption;
  if (!schema) return { fits: true, strict: false };

  // delegate the accept + strict probe to the schema-fit abstraction (lib-agnostic)
  const fit = getSchemaFit({
    schema,
    props: prop,
    schemaName: ClassOption.name,
  });
  if (!fit.accepts) return { fits: false, strict: false };
  return { fits: true, strict: fit.strict };
};

/**
 * .what = returns the declared options whose schema accepts the prop, each tagged with strictness
 * .why = structural disambiguation chooses among the options that fit; a named step reads clearer
 *   than an inline map/filter pipeline the reader must simulate
 */
const getAllOptionsThatFit = ({
  options,
  prop,
}: {
  options: DomainObjectConstructor[];
  prop: any;
}): Array<{
  ClassOption: DomainObjectConstructor;
  strict: boolean;
}> =>
  options
    .map((ClassOption) => ({
      ClassOption,
      ...analyzeNestedOptionFit({ ClassOption, prop }),
    }))
    .filter((candidate) => candidate.fits)
    // drop `fits` (always true post-filter); callers only read ClassOption + strict
    .map(({ ClassOption, strict }) => ({ ClassOption, strict }));

/**
 * .what = instantiates a single nested value into the correct declared DomainObject option
 * .why = a nested value may arrive plain (deserialized) or already instantiated; this settles which
 *   option it belongs to — via the `_dobj` discriminator or strict-schema try-each — and builds it
 */
const instantiateOneNestedProp = ({
  prop,
  ClassOptions,
  domainObjectName,
  key,
}: {
  prop: any;
  ClassOptions: DomainObjectConstructor[];
  domainObjectName: string;
  key: string;
}): any => {
  // if it's a bare value (scalar or null), leave it un-hydrated — mirror the field-level guard,
  // since no domain object would validate a primitive (e.g. a bare scalar inside a nested array)
  if (typeof prop !== 'object' || prop === null) return prop;

  // grab the names of each declared option, to check against + report on in errors
  const declaredNestedClassNameOptionsForProp = ClassOptions.map(
    (ClassOption) => ClassOption.name,
  );

  // if it's already an instance of a valid option, keep it as-is
  const instantiatedClassName = isOfDomainObject(prop)
    ? prop.constructor.name
    : null;
  if (
    instantiatedClassName &&
    declaredNestedClassNameOptionsForProp.includes(instantiatedClassName)
  )
    return prop;

  // `_dobj` is a serialization discriminator, not a domain field; strip it before we build any option
  // (else a strict schema rejects it as an unrecognized key). when absent, reuse the prop as-is,
  // so a domain-object instance keeps its narrow-down behavior instead of a collapse into a plain copy
  // .note = this strips `_dobj` from the *nested value* to build; the top-level strip in
  //   hydrateNestedDomainObjects targets the *parent* props object — different objects, both needed
  const propToBuild =
    prop[NESTED_DOBJ_CLASS_KEY] === undefined
      ? prop
      : omit(prop, [NESTED_DOBJ_CLASS_KEY]);

  // if there's only one option, hydrate into it directly - no disambiguation needed
  if (ClassOptions.length === 1) return ClassOptions[0]!.build(propToBuild);

  // multi-option: prefer the explicit `_dobj` discriminator when present (skip try-each entirely)
  const declaredClassNameOfProp = prop[NESTED_DOBJ_CLASS_KEY];
  if (declaredClassNameOfProp) {
    const CorrectNestedDomainObject = ClassOptions.find(
      (ClassOption) => ClassOption.name === declaredClassNameOfProp,
    );
    if (!CorrectNestedDomainObject)
      throw new NestedDomainObjectHydrationError(
        `
DomainObject property ${domainObjectName}.${key} was declared as a nested domain object with ${ClassOptions.length} options and had a ._dobj key specified on the input. However, the specified ._dobj was not found as one of the declared nested domain object options. In other words, the correct class constructor was not present on the DomainObject.nested definition.

Please check the declared nested domain object options for ${domainObjectName}.${key} and update it to include ${declaredClassNameOfProp}, or correct the ._dobj value in the data to match a declared option.
        `.trim(),
        {
          key,
          prop,
          declaredNestedClassNameOptionsForProp,
        },
      );
    return CorrectNestedDomainObject.build(propToBuild);
  }

  // no usable `_dobj`: disambiguate structurally by try-each schema validation.
  // probe `propToBuild` (the `_dobj`-stripped object that will actually be built), not the raw
  // `prop` — a present-but-falsy `_dobj` (null, '') skips the branch above yet still lingers on
  // `prop`, and a strict schema would reject that unknown key and wrongly report "no option fits"
  const fits = getAllOptionsThatFit({
    options: ClassOptions,
    prop: propToBuild,
  });

  // strict schemas are required to trust "validates → fits"; failfast on every loose fit
  const fitsLoose = fits.filter((candidate) => !candidate.strict);
  if (fitsLoose.length) {
    const optionsNotStrict = fitsLoose.map(
      (candidate) => candidate.ClassOption.name,
    );
    throw new NestedDomainObjectHydrationError(
      `
DomainObject property ${domainObjectName}.${key} was given a plain object with ${ClassOptions.length} nested options and no ._dobj discriminator. Structural disambiguation requires every option to declare a strict (closed) schema, but these options are not strict (or declare no schema): [${optionsNotStrict.join(
        ', ',
      )}] — so a superset object could fit one silently.

Please declare strict schemas on all options for ${domainObjectName}.${key}, or pass a ._dobj discriminator, or instantiate ${domainObjectName}.${key} as a nested DomainObject explicitly.
      `.trim(),
      {
        key,
        prop,
        optionsNotStrict,
        declaredNestedClassNameOptionsForProp,
      },
    );
  }

  // no option fits → the plain object matched none of the declared option schemas
  if (fits.length === 0)
    throw new NestedDomainObjectHydrationError(
      `
DomainObject property ${domainObjectName}.${key} was given a plain object that fits no declared nested option by schema. Checked options: [${declaredNestedClassNameOptionsForProp.join(
        ', ',
      )}].

Please ensure the object matches one option's schema, or pass a ._dobj discriminator, or instantiate ${domainObjectName}.${key} as a nested DomainObject explicitly.
      `.trim(),
      { key, prop, declaredNestedClassNameOptionsForProp },
    );

  // many options fit → ambiguous; the author must disambiguate
  if (fits.length > 1)
    throw new NestedDomainObjectHydrationError(
      `
DomainObject property ${domainObjectName}.${key} was given a plain object that fits more than one declared nested option ([${fits
        .map((candidate) => candidate.ClassOption.name)
        .join(
          ', ',
        )}]) — it is ambiguous. Please disambiguate via a ._dobj discriminator, or instantiate ${domainObjectName}.${key} as a nested DomainObject explicitly.
      `.trim(),
      {
        key,
        prop,
        optionsFit: fits.map((candidate) => candidate.ClassOption.name),
        declaredNestedClassNameOptionsForProp,
      },
    );

  // exactly one strict fit → hydrate into it
  return fits[0]!.ClassOption.build(propToBuild);
};

/**
 * .what = hydrates one declared nested key's value (single or array) into DomainObject instance(s)
 * .why = keeps the top-level accumulation a thin narrative; all the per-key work lives here
 * .note = a null or absent (undefined/primitive) value is returned untouched — a nested field may be
 *   nullable or optional, and no DomainObject would validate a non-object, so hydration is a no-op there
 */
const getOneHydratedNestedProp = ({
  key,
  declared,
  props,
  domainObjectName,
}: {
  key: string;
  declared: DomainObjectConstructor | DomainObjectConstructor[];
  props: Record<string, any>;
  domainObjectName: string;
}): any => {
  // the declaration must be a DomainObject, or an array of DomainObject options
  const ClassOptions: DomainObjectConstructor[] = isArray(declared)
    ? declared
    : [declared];
  const eachIsDomainObjectBased = ClassOptions.every(isOfDomainObject);
  if (!eachIsDomainObjectBased)
    throw new NestedDomainObjectHydrationError(
      `each value of each ${domainObjectName}.nested.${key} must be a single typeof DomainObject or an array of options of typeof DomainObject`,
      {
        dobj: domainObjectName,
        key,
        // serialize option names, not the class constructors (which serialize to null)
        declaredNestedClassNameOptionsForProp: ClassOptions.map(
          (ClassOption) => ClassOption?.name ?? '(non-DomainObject)',
        ),
      },
    );

  // a non-object or null value is left untouched (the field may be nullable or optional)
  const nestedProp = props[key];
  if (typeof nestedProp !== 'object' || nestedProp === null) return nestedProp;

  // instantiate each array element independently, or the single value
  return isArray(nestedProp)
    ? nestedProp.map((element) =>
        instantiateOneNestedProp({
          prop: element,
          ClassOptions,
          domainObjectName,
          key,
        }),
      )
    : instantiateOneNestedProp({
        prop: nestedProp,
        ClassOptions,
        domainObjectName,
        key,
      });
};

/**
 * .what = builds a record that maps each declared nested key to its hydrated value
 * .why = holds the per-key fold in a named transformer, so the orchestrator below reads as a
 *   two-step narrative instead of an inline reduce
 */
const getAllHydratedNestedProps = ({
  props,
  nested,
  domainObjectName,
}: {
  props: Record<string, any>;
  nested: Record<string, DomainObjectConstructor | DomainObjectConstructor[]>;
  domainObjectName: string;
}): Record<string, any> =>
  Object.keys(nested).reduce<Record<string, any>>(
    (hydratedNestedProps, key) => ({
      ...hydratedNestedProps,
      [key]: getOneHydratedNestedProp({
        key,
        declared: nested[key]!,
        props,
        domainObjectName,
      }),
    }),
    {},
  );

/**
 * .what = hydrates each declared nested prop into its DomainObject instance, out of the declared option(s)
 * .why = a `.nested` declaration promises the nested value is a DomainObject; hydration honors that promise
 *   on `.build`, so callers can pass plain (e.g. deserialized) objects and still receive typed instances
 * .how =
 *   - single option → build directly into it
 *   - multi-option + `_dobj` discriminator → build into the named option (try-each skipped)
 *   - multi-option, no `_dobj` → disambiguate by strict-schema try-each (failfast on loose/absent schema, zero, or many fits)
 * .note = a null or absent (undefined/primitive) nested value is left untouched — a nested field may be
 *   nullable or optional, and no DomainObject would validate a non-object, so hydration is a no-op there
 */
export const hydrateNestedDomainObjects = ({
  props,
  nested,
  domainObjectName,
}: {
  props: Record<string, any>;
  nested: Record<string, DomainObjectConstructor | DomainObjectConstructor[]>;
  domainObjectName: string;
}): Record<string, any> => {
  // strip the `_dobj` serialization discriminator from the parent props (not a domain field)
  // .note = this strips `_dobj` from the *parent* props; the strip inside instantiateOneNestedProp
  //   targets each *nested value* — different objects, both needed
  const propsSansDiscriminator = omit(props, [NESTED_DOBJ_CLASS_KEY]);

  // overlay each declared nested key's hydrated value onto the parent props
  const hydratedNestedProps = getAllHydratedNestedProps({
    props,
    nested,
    domainObjectName,
  });
  return { ...propsSansDiscriminator, ...hydratedNestedProps };
};
