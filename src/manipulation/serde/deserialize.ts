/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { DomainObject } from '../..';

export class DeserializationMissingDomainObjectClassError extends Error {
  constructor({ className }: { className: string }) {
    const message = `
DomainObject '${className}' was referenced in the string being deserialized but was missing from the context given to the deserialize method.

Please make sure all DomainObjects serialized in the string have their classes defined in the context given to the deserialize method, using the 'with' property.
    `;
    super(message);
  }
}

/**
 * Revives the domain objects stored in a string produced by the `serialize` method
 *
 * Use Cases:
 * - persistance
 *   - e.g., deserialize domain objects from a string that was saved to a persistant store (i.e., a string produced by the `serialize` method)
 */
export const deserialize = <T extends any>(serialized: string, context: { with?: DomainObject<any>[] } = {}): T => {
  // parse the string
  const parsed = JSON.parse(serialized);

  // recursively traverse the parsed value to hydrate all domain objects
  return toHydrated(parsed, { with: context.with ?? [] });
};

/**
 * helper method for deserialize
 *
 * hydrates any domain-objects in the previously serialized value, if present
 */
const toHydrated = (value: any, context: { with: DomainObject<any>[] }): any => {
  // if this value is not an array and is not an object, then it's a literal, and there's no more hydration to be done
  if (!Array.isArray(value) && typeof value !== 'object') return value;

  // if its null, return it too (null is typeof 'object' in js :shrug:)
  if (value === null) return null;

  // if its an array, then `toHydrated` each element
  if (Array.isArray(value)) return value.map((el) => toHydrated(el, context));

  // otherwise, hydrate the object
  return toHydratedObject(value, context);
};

/**
 * helper method for `toSerializable`
 *
 * converts all objects to deterministically serializable objects (e.g., sort keys, handle domain objects, etc)
 */
const toHydratedObject = (obj: Record<string, any>, context: { with: DomainObject<any>[] }) => {
  // if this object is a domain object, lookup its constructor and hydrate it
  if (obj._dobj) {
    // pull its name from the key that the `serialize` method sticks the name onto
    const domainObjectClassName = obj._dobj;

    // lookup the domain object constructor from context
    const DomainObjectConstructor = context.with.find((constructor) => (constructor as typeof DomainObject).name === domainObjectClassName) as
      | typeof DomainObject
      | undefined;
    if (!DomainObjectConstructor) throw new DeserializationMissingDomainObjectClassError({ className: domainObjectClassName });

    // hydrate the domain object, now that it was given.
    return new DomainObjectConstructor(obj); // (note: domain objects hydrate their nested domain-object properties themselves, so we can just return the result here :smile:)
  }

  // since this was not a domain object, recursively traverse each key
  const hydratedObj: Record<string, any> = {};

  // for each key, recursively hydrate it
  Object.keys(obj).forEach((key) => {
    hydratedObj[key] = toHydrated(obj[key], context);
  });

  // return it
  return hydratedObj;
};
