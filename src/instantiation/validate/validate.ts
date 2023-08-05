import type { Schema as JoiSchema } from 'joi';
import type { ValidationError, Schema as YupSchema } from 'yup';

// only importing types -> dev dep
import { HelpfulJoiValidationError } from './HelpfulJoiValidationError';
import { HelpfulYupValidationError } from './HelpfulYupValidationError';

export type SchemaOptions = YupSchema<any> | JoiSchema;

const isJoiSchema = (schema: SchemaOptions): schema is JoiSchema => {
  if ((schema as JoiSchema).$) return true; // joi schemas have `$`, yup does not
  return false;
};

const isYupSchema = (schema: SchemaOptions): schema is YupSchema<any> => {
  // for now, since we only support two options, if its not a joi schema, it must be a yup schema
  return !isJoiSchema(schema);
};

export const validate = ({
  domainObjectName,
  schema,
  props,
}: {
  domainObjectName: string;
  schema: SchemaOptions;
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
};
