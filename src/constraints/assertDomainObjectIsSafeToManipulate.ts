import type { DomainObject } from '../instantiation/DomainObject';
import { isOfDomainObject } from '../instantiation/inherit/isOfDomainObject';

export class DomainObjectNotSafeToManipulateError extends Error {
  constructor({
    unsafeKeys,
    className,
  }: {
    unsafeKeys: string[];
    className: string;
  }) {
    const message = `
DomainObject '${className}' is not safe to manipulate.

Specifically, the keys: ${JSON.stringify(unsafeKeys)}.

Please make sure all nested objects are DomainObjects and are explicitly defined on the class definition, using the 'nested' static property.

For example:
\`\`\`ts
  class ${className} ... {
    public static nested = { ${unsafeKeys[0]}: ... };
  }
\`\`\`
    `;
    super(message);
  }
}

/**
 * For internal use only. DomainObjects must have all nested domain objects defined in their `DomainObject.nested` definition. Otherwise, we could be dealing with a domain object that is not instantiated, and thus we will not appropriately serialize it.
 *
 * Therefore, if any DomainObject has nested objects that are not instantiated as DomainObjects, there is a risk that the nested object is really a nested, uninstantiated DomainObject - which would cause bugs if uncaught.
 *
 * @param obj - The domain object to validate
 * @param options - Optional configuration
 * @param options.onKeys - When provided, only validates the specified keys; otherwise validates all keys
 */
export const assertDomainObjectIsSafeToManipulate = <
  T extends Record<string, any>,
>(
  obj: DomainObject<T> & Record<string, any>,
  options?: { onKeys?: string[] },
): void => {
  // determine which keys to check based on options
  const keysToCheck = options?.onKeys ?? Object.keys(obj);

  // grab the keys that have objects defined for their values
  const nestedObjectKeys = keysToCheck.filter(
    (key) => typeof obj[key] === 'object' && obj[key] !== null,
  );

  // grab all the "nested object keys" who's values are defined as "should be domain object"
  const nestedDomainObjectKeysDefined = Object.keys(
    (obj.constructor as typeof DomainObject).nested ?? {},
  );
  const nestedNonDomainObjectObjectKeys = nestedObjectKeys.filter(
    (key) => !nestedDomainObjectKeysDefined.includes(key),
  ); // not explicitly defined as a nested domain object key

  // now apply some filters to those concerning keys
  let concerningKeys = nestedNonDomainObjectObjectKeys;

  // now filter out the keys which correspond to well known objects that we known are serializable and are not potentially DomainObjects (e.g., dates)
  concerningKeys = concerningKeys.filter((concerningKey) => {
    const value = obj[concerningKey];
    if (isOfDomainObject(value)) return false; // if value is already as a domain object, not concerning
    if (value instanceof Date) return false; // if its a date, not concerning
    if ('Buffer' in globalThis && value instanceof Buffer) return false; // if its a buffer, not concerning
    return true; // if it wasn't filtered out by now, its still concerning
  });

  // now filter out the keys which correspond to arrays of objects which are safe to manipulate; // TODO: consider how we can move this check to not be dependent on runtime contents of the domain object instance
  concerningKeys = concerningKeys.filter((concerningKey) => {
    const value = obj[concerningKey];
    if (!Array.isArray(value)) return true; // if its not an array, its still concerning
    try {
      assertDomainObjectIsSafeToManipulate(value);
      return false; // if we reached here, that means that the contents of the array _are_ safe, so not concerning
    } catch (error) {
      if (error instanceof DomainObjectNotSafeToManipulateError) return true; // if it was this error, that means that this key is definitely still concerning
      throw error; // otherwise its an error we couldn't handle, so we should pass it up
    }
  });

  // if we have any concerningKeys still, then its not safe!
  if (concerningKeys.length)
    throw new DomainObjectNotSafeToManipulateError({
      unsafeKeys: concerningKeys,
      className: obj.constructor.name,
    });
};
