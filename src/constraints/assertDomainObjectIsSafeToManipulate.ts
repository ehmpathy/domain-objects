import { DomainObject } from '../instantiation/DomainObject';

export class DomainObjectNotSafeToManipulateError extends Error {
  constructor({ unsafeKeys, className }: { unsafeKeys: string[]; className: string }) {
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
 */
export const assertDomainObjectIsSafeToManipulate = <T extends Record<string, any>>(obj: DomainObject<T> & Record<string, any>): void => {
  // grab all the keys that have objects defined for their values
  const nestedObjectKeys = Object.keys(obj).filter((key) => typeof obj[key] === 'object' && obj[key] !== null);

  // grab all the "nested object keys" who's values are defines as "should be domain object"
  const nestedDomainObjectKeysDefined = Object.keys((obj.constructor as typeof DomainObject).nested ?? {});
  const nestedNonDomainObjectObjectKeys = nestedObjectKeys.filter((key) => !nestedDomainObjectKeysDefined.includes(key)); // not explicitly defined as a nested domain object key

  // if we have any nestedNonDomainObjectObjectKeys, then its not safe!
  if (nestedNonDomainObjectObjectKeys.length)
    throw new DomainObjectNotSafeToManipulateError({ unsafeKeys: nestedNonDomainObjectObjectKeys, className: obj.constructor.name });
};
