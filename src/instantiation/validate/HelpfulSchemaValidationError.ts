/**
 * .what = common base for every schema-library validation error (zod, joi, yup, ...)
 * .why = lets a single `instanceof HelpfulSchemaValidationError` recognize any schema
 *   validation failure. a new schema library extends this base — no consumer of the
 *   check (e.g. try-each hydration) needs to enumerate a closed list of libraries
 */
export class HelpfulSchemaValidationError extends Error {}
