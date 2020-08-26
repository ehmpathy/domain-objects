import { Schema } from 'joi';
import { validate } from './validate/validate';

/**
 * Domain Object
 *
 * Responsibilities:
 * - optionally validate the properties that are passed into the constructor against the schema at runtime, if schema is supplied
 * - assign all properties that are passed into constructor to self, after optional runtime validation
 */
export class DomainObject<T> {
  constructor(props: T) {
    // 1. validate with the schema if provided
    const { schema } = this.constructor as typeof DomainObject; // `this.constructor` does not get typed to DomainObject automatically by ts; https://stackoverflow.com/questions/33387318/access-to-static-properties-via-this-constructor-in-typescript
    if (schema) validate({ props, schema, domainObjectName: this.constructor.name });

    // 2. assign all properties to self if passed validation
    Object.assign(this, props);
  }

  /**
   * DomainObject.schema
   *
   * When set, will be used to validate the properties passed into the constructor at runtime (i.e., during instantiation)
   */
  public static schema?: Schema;
}
