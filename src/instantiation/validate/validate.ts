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

const isZodSchema = (schema: SchemaOptions<any>): schema is ZodSchema<any> => {
  if ((schema as ZodSchema<any>)._refinement) return true; // only zod schemas have _refinement
  return false;
};

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
