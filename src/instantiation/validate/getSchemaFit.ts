import { HelpfulSchemaValidationError } from './HelpfulSchemaValidationError';
import { type SchemaOptions, validate } from './validate';

/**
 * .what = an unknown key we add to props to probe whether a schema is strict (closed)
 * .why = a strict schema rejects unknown keys; a non-strict one silently accepts them.
 *   to trust "validates → structurally fits", the schema must reject supersets. so we test it:
 *   add a key no legitimate schema declares, then check whether it still accepts.
 * .note = avoid a domain field named `__domainObjectStrictProbeKey__`; if a schema declares it,
 *   the probe misfires and reports non-strict even for a genuinely closed schema
 */
const STRICT_PROBE_KEY = '__domainObjectStrictProbeKey__';

/**
 * .what = detects whether an error is a schema validation failure (vs an unexpected error)
 * .why = a fit check treats a validation failure as "the schema does not accept"; a different error
 *   is a real problem and must propagate, never be swallowed
 * .note = checks the shared `HelpfulSchemaValidationError` base, so any schema library
 *   (zod/joi/yup and any future one) is recognized without a closed instanceof list
 */
const isSchemaValidationError = (error: unknown): boolean =>
  error instanceof HelpfulSchemaValidationError;

/**
 * .what = returns true if the schema accepts the props, false if it rejects them
 * .why = a fit check needs a boolean "does the schema accept this"; validate throws on mismatch,
 *   so we catch validation errors as "does not accept" and rethrow the unexpected (no failhide)
 * .note = the schema name is threaded into validate so an unexpected (rethrown) error names
 *   which schema was probed, instead of an empty domain-object name
 */
const doesSchemaAccept = ({
  schema,
  props,
  schemaName,
}: {
  schema: SchemaOptions<any>;
  props: any;
  schemaName: string;
}): boolean => {
  try {
    validate({ schema, props, domainObjectName: schemaName });
    return true;
  } catch (error) {
    if (isSchemaValidationError(error)) return false;
    throw error;
  }
};

/**
 * .what = reports whether a schema accepts the props, and (when it accepts) whether it is strict (closed)
 * .why = structural disambiguation needs both signals; callers get them without any knowledge of
 *   the specific schema library (zod/joi/yup) or the strict-probe mechanism — that stays here
 * .note = strict is only meaningful when the schema accepts the props (there is no accepted object
 *   to probe otherwise); the union return makes that a compile-time guarantee — `strict` is only
 *   present on the `accepts: true` branch, so callers cannot read it when `accepts: false`
 */
export const getSchemaFit = ({
  schema,
  props,
  schemaName,
}: {
  schema: SchemaOptions<any>;
  props: any;
  schemaName: string;
}): { accepts: false } | { accepts: true; strict: boolean } => {
  // does the schema accept the props as-is?
  const accepts = doesSchemaAccept({ schema, props, schemaName });
  if (!accepts) return { accepts: false };

  // strict probe: if an added unknown key still passes, the schema is non-strict
  const acceptsSuperset = doesSchemaAccept({
    schema,
    props: { ...props, [STRICT_PROBE_KEY]: true },
    schemaName,
  });
  return { accepts: true, strict: !acceptsSuperset };
};
