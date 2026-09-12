// only importing types -> dev dep
import type { Schema as JoiSchema } from 'joi';
import type { ValidationError, Schema as YupSchema } from 'yup';
import type { ZodError, ZodSchema } from 'zod';

import { HelpfulJoiValidationError } from './HelpfulJoiValidationError';
import { HelpfulYupValidationError } from './HelpfulYupValidationError';
import { HelpfulZodValidationError } from './HelpfulZodValidationError';

export type SchemaOptions<T> = ZodSchema<T> | YupSchema<T> | JoiSchema;

const isJoiSchema = (schema: SchemaOptions<any>): schema is JoiSchema => {
  if ((schema as JoiSchema).$) return true; // joi schemas have `$`, zod and yup do not
  return false;
};

export const isZodSchema = (
  schema: SchemaOptions<any>,
): schema is ZodSchema<any> => {
  // detect via the public `.safeParse` method (zod-only); replaces zod 3's `_refinement` internal, which was removed in zod 4 (our baseline)
  if (typeof (schema as ZodSchema<any>).safeParse === 'function') return true;
  return false;
};

/**
 * .what = true when a zod schema exposes `.meta()` — i.e. it is zod v4+, not v3
 * .why = `isZodSchema` duck-types on `.safeParse`, which BOTH v3 and v4 expose, so a v3 schema
 *   passes that guard and then meets a raw `TypeError: schema.meta is not a function` deep inside
 *   the pragma stamp. `.meta()` is zod v4's metadata registry and has no v3 equivalent, so it is
 *   the narrowest honest probe for the version this repo's contract surface requires.
 * .note = a predicate rather than an assert, to match `isZodSchema`'s shape — each caller owns its
 *   own error text, since the name of the surface that needs v4 differs by call site.
 */
export const isZodSchemaWithMeta = (schema: ZodSchema<any>): boolean =>
  typeof (schema as { meta?: unknown }).meta === 'function';

const isYupSchema = (schema: SchemaOptions<any>): schema is YupSchema<any> => {
  if ((schema as YupSchema<any>).isValidSync) return true; // only yup schemas have this property
  return false;
};

export const validate = ({
  domainObjectName,
  schema,
  props,
}: {
  domainObjectName: string;
  schema: SchemaOptions<any>;
  props: any;
}): void => {
  if (isJoiSchema(schema)) {
    const result = schema.validate(props);
    if (result.error)
      throw new HelpfulJoiValidationError({
        domainObject: domainObjectName,
        error: result.error,
        props,
      });
  }
  if (isYupSchema(schema)) {
    try {
      schema.validateSync(props);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.constructor.name === 'ValidationError')
        throw new HelpfulYupValidationError({
          domainObject: domainObjectName,
          error: error as ValidationError,
          props,
        }); // if we got a yup validation error, make it more helpful
      throw error; // otherwise throw the error we got
    }
  }
  if (isZodSchema(schema)) {
    try {
      schema.parse(props);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.constructor.name === 'ZodError')
        throw new HelpfulZodValidationError({
          domainObject: domainObjectName,
          error: error as ZodError,
          props,
        }); // if we got a yup validation error, make it more helpful
      throw error; // otherwise throw the error we got
    }
  }
};
