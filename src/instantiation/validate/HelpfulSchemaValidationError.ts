import { ConstraintError } from 'helpful-errors';

/**
 * .what = common base for every schema-library validation error (zod, joi, yup, ...)
 * .why = lets a single `instanceof HelpfulSchemaValidationError` recognize any schema
 *   validation failure. a new schema library extends this base — no consumer of the
 *   check (e.g. try-each hydration) needs to enumerate a closed list of libraries
 * .note = extends ConstraintError — a schema validation failure means the caller supplied
 *   props that violate the declared shape (their fault), so exit code 2 + http 400 fit
 */
export class HelpfulSchemaValidationError extends ConstraintError {}
